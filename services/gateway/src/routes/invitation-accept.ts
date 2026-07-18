// POST /api/v1/invitations/accept — the register-on-accept path.
//
// Cross-service orchestration (the gateway is a BFF, so a multi-service
// route is acceptable here):
//   1. rescue.GetInvitationByToken — validate the token is pending
//      (unused + unexpired) and read the invitee's email.
//   2. auth.ProvisionInvitedUser — create-or-find the auth user for that
//      email with the supplied password (already verified + active; the
//      invite link came from a trusted email). An existing account is
//      attached, not errored.
//   3. rescue.AcceptInvitation — mark the invitation used + insert the
//      staff membership for the resolved user_id.
//
// We deliberately DON'T issue login tokens — the invitee logs in normally
// afterwards (scope kept tight).
//
// Public — the invitation token IS the credential; no principal required.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { RescueClient } from '../grpc-clients/rescue-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

import type { EmailRateLimiter } from './email-rate-limiter.js';

// Per-IP cap (ADS-961) — mirrors AUTH_RATE_LIMITS.redeemInvitation in
// auth.ts, which carries identical account-provisioning weight.
const IP_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;

export type InvitationAcceptRoutesOptions = {
  authClient: AuthClient;
  rescueClient: RescueClient;
  // Per-token rate limiter (ADS-961), keyed on body.token instead of an
  // email — reuses the createEmailRateLimiter shape from
  // email-rate-limiter.ts since it's just a generic string-keyed counter.
  // Layered on top of the per-IP cap above so a token brute-force spread
  // across rotating IPs (or a rotating X-Forwarded-For) is still capped.
  // Optional so tests / dev that don't wire it keep the per-IP-only
  // behaviour.
  tokenRateLimiter?: EmailRateLimiter;
  // Called each time the per-token cap trips. Lets the caller (server.ts)
  // increment a Prometheus counter without this route module reaching into
  // the metrics registry directly.
  onTokenRateLimitTrip?: () => void;
};

type AcceptBody = {
  token?: string;
  password?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
};

export const registerInvitationAcceptRoutes = async (
  app: FastifyInstance,
  opts: InvitationAcceptRoutesOptions
): Promise<void> => {
  const { authClient, rescueClient, tokenRateLimiter, onTokenRateLimitTrip } = opts;

  // Per-token cap preHandler (ADS-961) — a no-op when no limiter is wired,
  // same pattern as auth.ts's emailRateLimit helper.
  const tokenRateLimit = tokenRateLimiter
    ? async (req: FastifyRequest, reply: FastifyReply) => {
        const token = (req.body as { token?: string } | undefined)?.token;
        if (!token) {
          return;
        }
        const allowed = await tokenRateLimiter.consume(token);
        if (!allowed) {
          onTokenRateLimitTrip?.();
          return reply.code(429).send({ error: 'Too many requests for this invitation' });
        }
      }
    : undefined;

  app.post(
    '/api/v1/invitations/accept',
    {
      config: { rateLimit: IP_RATE_LIMIT },
      preHandler: tokenRateLimit,
      schema: {
        tags: ['invitations'],
        summary: 'Accept a rescue staff invitation and provision the user account',
        security: [],
        body: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            password: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              userId: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as AcceptBody;
      const token = body.token ?? '';
      const password = body.password ?? '';
      const firstName = body.firstName ?? body.first_name ?? '';
      const lastName = body.lastName ?? body.last_name ?? '';

      if (!token) {
        return reply.code(400).send({ error: 'token is required' });
      }
      if (!password) {
        return reply.code(400).send({ error: 'password is required' });
      }
      if (!firstName || !lastName) {
        return reply.code(400).send({ error: 'firstName and lastName are required' });
      }

      const metadata = buildMetadata(req);

      try {
        // 1. Validate the invitation + read the invitee's email. NOT_FOUND
        //    (unknown / used / expired) surfaces as 404.
        const details = await rescueClient.getInvitationByToken({ token }, metadata);
        const email = details.invitation?.email;
        if (!email) {
          return reply.code(404).send({ error: 'invitation not found or no longer valid' });
        }

        // 2. Create-or-find the auth user with the invitee's trusted email.
        const provisioned = await authClient.provisionInvitedUser(
          { email, password, firstName, lastName },
          metadata
        );
        const userId = provisioned.user?.userId;
        if (!userId) {
          return reply.code(500).send({ error: 'internal_error' });
        }

        // 3. Consume the invitation + attach staff membership.
        const accepted = await rescueClient.acceptInvitation({ token, userId }, metadata);

        return reply.code(201).send({
          success: true,
          message: 'Invitation accepted',
          userId,
          data: accepted.staffMember,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
