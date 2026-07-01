// Public config endpoint — ports service.backend's /api/v1/config
// public surface into the gateway.
//
// The monolith's ConfigurationService maintains a Map<key, ConfigItem>
// where each item flags isPublic. The `/` route returns only the public
// items as a flat {key: value} map. The default values are static —
// the monolith's only mutation path is admin-only and doesn't ship
// over the public API — so the gateway can serve the same shape from
// an inline literal without a DB lookup.
//
// When more public keys are added on the monolith side, mirror them
// here. The plan's "CMS folds into service.gateway" arc absorbs the
// admin config write surface; until that lands, admin config flows
// through the catch-all proxy to the monolith.

import type { FastifyInstance } from 'fastify';

// Default public configuration. Mirrors the `isPublic: true` entries
// from service.backend/src/services/configuration.service.ts.
const DEFAULT_PUBLIC_CONFIG: Record<string, string | number | boolean> = {
  'app.name': "Adopt Don't Shop",
  'app.version': '1.0.0',
  'security.password_min_length': 8,
  'ui.theme': 'light',
};

export const registerConfigRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get(
    '/api/v1/config',
    {
      schema: {
        tags: ['config'],
        summary: 'Return public application configuration values',
        security: [],
        response: {
          200: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (_req, reply) => reply.send(DEFAULT_PUBLIC_CONFIG)
  );
};
