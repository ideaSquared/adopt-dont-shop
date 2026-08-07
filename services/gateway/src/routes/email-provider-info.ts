// GET /api/v1/email/provider-info — dev-only diagnostic consumed by
// lib.dev-tools' useEtherealCredentials hook (the "where did my email go?"
// widget). The hook only calls this from localhost and already degrades to
// mock credentials on a 404, so this route exists purely to stop the
// gateway logging every mount as an "unmatched API route".
//
// Gateway-folded (no upstream service): the authoritative per-send preview
// URL and the lazily-created Ethereal SMTP account credentials live inside
// service.notifications' EtherealProvider and are deliberately NOT exposed
// over gRPC (they're dev-only secrets surfaced in that service's logs). So
// the gateway reports only what it can honestly know — the configured
// provider name and, for Ethereal, its public web endpoints. The hook fills
// the user/pass fields from its own dev fallback when they're absent.

import type { FastifyInstance } from 'fastify';

// The email provider is a service.notifications concern; the gateway does
// not run the mailer, so it has no live handle to the account. EMAIL_PROVIDER
// is read best-effort (it may be unset in the gateway container) and defaults
// to 'ethereal', which is the dev-stack default.
const resolveProvider = (): string => {
  const raw = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (raw === 'console' || raw === 'resend' || raw === 'ethereal') {
    return raw;
  }
  return 'ethereal';
};

export const registerEmailProviderInfoRoute = async (app: FastifyInstance): Promise<void> => {
  app.get(
    '/api/v1/email/provider-info',
    {
      schema: {
        tags: ['email'],
        summary: 'Dev-only email provider descriptor (Ethereal preview links)',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              loginUrl: { type: 'string' },
              messagesUrl: { type: 'string' },
            },
            required: ['provider'],
          },
        },
      },
    },
    async (_req, reply) => {
      const provider = resolveProvider();
      if (provider === 'ethereal') {
        return reply.send({
          provider: 'ethereal.email',
          loginUrl: 'https://ethereal.email/login',
          messagesUrl: 'https://ethereal.email/messages',
        });
      }
      return reply.send({ provider });
    }
  );
};
