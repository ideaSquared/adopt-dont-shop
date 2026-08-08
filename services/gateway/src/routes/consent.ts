// REST → gRPC translation for the legal-consent surface (ADS-1137).
//
// Backs the post-login re-acceptance modal and the cookie banner:
//
//   POST /api/v1/privacy/consent            → AuthService.RecordConsent
//   POST /api/v1/privacy/cookies-consent    → AuthService.RecordConsent (cookies only)
//   GET  /api/v1/legal/pending-reacceptance → AuthService.GetConsentStatus
//
// All authenticated — identity comes from the validated principal the
// gateway stamps as x-user-* metadata; the consent store is self-scoped
// server-side (a caller can only ever record/read its own consent). The
// current document versions live in legal.ts as the single source of
// truth; pending re-acceptance is computed here by comparing the user's
// last-accepted version against them.

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { type RecordConsentRequest } from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { COOKIES_VERSION, PRIVACY_VERSION, TERMS_VERSION } from './legal.js';

export type ConsentRoutesOptions = {
  client: AuthClient;
};

// The documents pending re-acceptance is computed over, and their
// currently-published versions. legal.ts owns the version constants.
const DOCUMENT_TYPES = ['terms', 'privacy', 'cookies'] as const;
const CURRENT_VERSIONS: Record<(typeof DOCUMENT_TYPES)[number], string> = {
  terms: TERMS_VERSION,
  privacy: PRIVACY_VERSION,
  cookies: COOKIES_VERSION,
};

const RL_CONSENT = { max: 30, timeWindow: '1 minute' } as const;

export const registerConsentRoutes = async (
  app: FastifyInstance,
  opts: ConsentRoutesOptions
): Promise<void> => {
  const { client } = opts;

  await app.register(rateLimit, { global: false });

  // POST /api/v1/privacy/consent — records ToS / Privacy (and optionally
  // cookies) acceptance from the re-acceptance modal + registration.
  app.post<{
    Body: {
      tosAccepted?: boolean;
      privacyAccepted?: boolean;
      tosVersion?: string;
      privacyVersion?: string;
      cookiesVersion?: string;
      analyticsConsent?: boolean;
    };
  }>(
    '/api/v1/privacy/consent',
    {
      config: { rateLimit: RL_CONSENT },
      schema: {
        tags: ['privacy'],
        summary: 'Record ToS / Privacy (and optional cookies) consent',
        body: {
          type: 'object',
          properties: {
            tosAccepted: { type: 'boolean' },
            privacyAccepted: { type: 'boolean' },
            tosVersion: { type: 'string' },
            privacyVersion: { type: 'string' },
            cookiesVersion: { type: 'string' },
            analyticsConsent: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, recorded: { type: 'number' } },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      const decisions: RecordConsentRequest['decisions'] = [];
      if (body.tosAccepted) {
        decisions.push({ documentType: 'terms', version: body.tosVersion || TERMS_VERSION });
      }
      if (body.privacyAccepted) {
        decisions.push({
          documentType: 'privacy',
          version: body.privacyVersion || PRIVACY_VERSION,
        });
      }
      // Cookies rides along only when the caller supplied a cookies field.
      if (body.cookiesVersion !== undefined || body.analyticsConsent !== undefined) {
        decisions.push({
          documentType: 'cookies',
          version: body.cookiesVersion || COOKIES_VERSION,
          analyticsConsent: body.analyticsConsent,
        });
      }
      if (decisions.length === 0) {
        return reply
          .code(400)
          .send({ error: 'at least one of tosAccepted / privacyAccepted / cookies is required' });
      }
      try {
        const res = await client.recordConsent(
          { decisions, ipAddress: req.ip, userAgent: req.headers['user-agent'] },
          buildMetadata(req)
        );
        return reply.send({ success: true, recorded: res.recorded });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/privacy/cookies-consent — cookies-only path so the
  // cookie banner never records a ToS/Privacy acceptance the user never
  // gave (ADS-550).
  app.post<{ Body: { cookiesVersion?: string; analyticsConsent?: boolean } }>(
    '/api/v1/privacy/cookies-consent',
    {
      config: { rateLimit: RL_CONSENT },
      schema: {
        tags: ['privacy'],
        summary: 'Record cookies-only consent',
        body: {
          type: 'object',
          properties: {
            cookiesVersion: { type: 'string' },
            analyticsConsent: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: { success: { type: 'boolean' }, recorded: { type: 'number' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body ?? {};
      try {
        const res = await client.recordConsent(
          {
            decisions: [
              {
                documentType: 'cookies',
                version: body.cookiesVersion || COOKIES_VERSION,
                analyticsConsent: body.analyticsConsent,
              },
            ],
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          buildMetadata(req)
        );
        return reply.send({ success: true, recorded: res.recorded });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/legal/pending-reacceptance — documents whose current
  // version differs from the user's last-accepted version (a never-accepted
  // document counts as pending). Drives the post-login re-acceptance modal.
  app.get(
    '/api/v1/legal/pending-reacceptance',
    {
      schema: {
        tags: ['legal'],
        summary: 'List documents pending re-acceptance for the current user',
        response: {
          200: {
            type: 'object',
            properties: {
              pending: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    documentType: { type: 'string' },
                    currentVersion: { type: 'string' },
                    lastAcceptedVersion: { type: 'string', nullable: true },
                    lastAcceptedAt: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getConsentStatus({}, buildMetadata(req));
        const byType = new Map(res.records.map(record => [record.documentType, record]));
        const pending = DOCUMENT_TYPES.map(documentType => {
          const record = byType.get(documentType);
          return {
            documentType,
            currentVersion: CURRENT_VERSIONS[documentType],
            lastAcceptedVersion: record?.version ?? null,
            lastAcceptedAt: record?.acceptedAt ?? null,
          };
        }).filter(item => item.lastAcceptedVersion !== item.currentVersion);
        return reply.send({ pending });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};
