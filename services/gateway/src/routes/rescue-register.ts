// POST /api/v1/rescues/register — public rescue sign-up.
//
// Cross-service orchestration (the gateway is a BFF, so a multi-service
// route is acceptable here; the rescue service never touches the auth
// schema):
//   1. auth.RegisterRescueOwner — create the owner account
//      (pending_verification, user_type rescue_staff, verification email
//      mailed). An already-registered email gets no user back: nothing else
//      is created and the route answers like a new sign-up (the existing
//      holder is notified by service.auth, not told here).
//   2. rescue.RegisterRescue — create the rescue as PENDING (admin approval
//      required) and attach the owner as its first staff member.
//      If this step fails after step 1 already committed, the owner account
//      is rolled back (auth.DeleteUnverifiedRescueOwner) so the failure
//      never leaves an orphan the user can't retry with (ADS-1474).
//
// No login tokens are issued: the owner verifies their email, then signs in
// normally. Pending rescues are not usable until an admin verifies them.
//
// Public — an anonymous visitor is the intended caller; abuse is bounded by
// the per-IP cap below (same cap as POST /api/v1/auth/register).

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { NewPasswordSchema } from '@adopt-dont-shop/lib.validation';

import type { CreateRescueRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { buildMetadata } from '../middleware/metadata.js';

import { AUTH_RATE_LIMITS } from './auth.js';
import { normalizeEmail, type EmailRateLimiter } from './email-rate-limiter.js';
import { toValidationFailure } from './auth.schemas.js';

export type RescueRegisterRoutesOptions = {
  authClient: AuthClient;
  rescueClient: RescueClient;
  // Per-owner-email cap (same limiter as /auth/register). Each sign-up with an
  // already-registered email notifies that account, so the per-IP cap alone
  // would let a flood spread across IPs fill one inbox. Optional like the auth routes.
  emailRateLimiter?: EmailRateLimiter;
};

const required = (max: number) => z.string().trim().min(1, 'is required').max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform(v => (v ? v : undefined));

const RegisterRescueBodySchema = z.object({
  // Owner account.
  firstName: required(100),
  lastName: required(100),
  email: z.string().trim().min(1, 'is required').max(254).email('must be a valid email'),
  password: NewPasswordSchema,
  // Organisation. `rescueEmail` is the rescue's public contact address;
  // `email` above is the owner's login.
  name: required(255),
  rescueEmail: z.string().trim().min(1, 'is required').max(254).email('must be a valid email'),
  phone: optional(32),
  address: required(255),
  city: required(100),
  county: optional(100),
  postcode: required(20),
  country: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, 'must be a two-letter ISO 3166-1 alpha-2 code')
    .default('GB'),
  website: optional(255),
  description: optional(5000),
  mission: optional(5000),
  // Match the rescue.rescues column widths (varchar(8) / varchar(12)).
  companiesHouseNumber: optional(8),
  charityRegistrationNumber: optional(12),
  contactPerson: optional(255),
});

type RegisterRescueBody = z.infer<typeof RegisterRescueBodySchema>;

const toRescueRequest = (b: RegisterRescueBody): CreateRescueRequest => ({
  name: b.name,
  email: b.rescueEmail,
  phone: b.phone,
  address: b.address,
  city: b.city,
  county: b.county,
  postcode: b.postcode,
  country: b.country,
  website: b.website,
  description: b.description,
  mission: b.mission,
  companiesHouseNumber: b.companiesHouseNumber,
  charityRegistrationNumber: b.charityRegistrationNumber,
  contactPerson: b.contactPerson ?? `${b.firstName} ${b.lastName}`,
  contactEmail: b.rescueEmail,
  contactPhone: b.phone,
});

// Same body for a new sign-up and an already-registered owner email, so the
// response cannot be used to probe whether an account exists.
const NEUTRAL_RESPONSE = { success: true } as const;

export const registerRescueRegisterRoutes = async (
  app: FastifyInstance,
  opts: RescueRegisterRoutesOptions
): Promise<void> => {
  const { authClient, rescueClient, emailRateLimiter } = opts;

  app.post(
    '/api/v1/rescues/register',
    {
      config: { public: true, rateLimit: AUTH_RATE_LIMITS.register },
      preHandler: async (req, reply) => {
        const email = normalizeEmail((req.body as { email?: unknown } | undefined)?.email);
        if (emailRateLimiter && email !== undefined && !(await emailRateLimiter.consume(email))) {
          return reply.code(429).send({ error: 'Too many requests for this email' });
        }
      },
      schema: {
        tags: ['rescues'],
        summary: 'Register a new rescue organisation and its owner account (public)',
        security: [],
      },
    },
    async (req, reply) => {
      const parsed = RegisterRescueBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send(toValidationFailure(parsed.error));
      }
      const body = parsed.data;
      const metadata = buildMetadata(req);

      // Best-effort rollback of the owner account step 1 just committed, so a
      // failure in step 2 never leaves an orphan the user can't retry with
      // (ADS-1474). A compensation failure is logged, never thrown — it must
      // not mask or replace the real error from step 2.
      const compensate = async (ownerUserId: string) => {
        try {
          await authClient.deleteUnverifiedRescueOwner(
            { userId: ownerUserId, email: body.email },
            metadata
          );
        } catch (compensateErr) {
          req.log.error(
            { err: compensateErr, ownerUserId },
            'failed to roll back orphaned rescue owner account'
          );
        }
      };

      try {
        const owner = await authClient.registerRescueOwner(
          {
            email: body.email,
            password: body.password,
            firstName: body.firstName,
            lastName: body.lastName,
          },
          metadata
        );
        const ownerUserId = owner.user?.userId;
        if (!ownerUserId) {
          // Email already registered: auth created nothing and notified the
          // holder. Answer exactly like a new sign-up; create no rescue.
          return reply.code(201).send(NEUTRAL_RESPONSE);
        }

        try {
          const res = await rescueClient.registerRescue(
            { rescue: toRescueRequest(body), ownerUserId },
            metadata
          );
          if (res.rescue === undefined) {
            await compensate(ownerUserId);
            return reply.code(500).send({ success: false, error: 'register returned no rescue' });
          }
          return reply.code(201).send(NEUTRAL_RESPONSE);
        } catch (rescueErr) {
          await compensate(ownerUserId);
          throw rescueErr;
        }
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
