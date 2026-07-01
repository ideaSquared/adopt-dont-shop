// Legal content endpoints — ports service.backend's /api/v1/legal/*
// public surface into the gateway, per the plan's "small static reads
// fold into the gateway" guidance.
//
// Endpoints (monolith parity):
//   GET /api/v1/legal/terms
//   GET /api/v1/legal/privacy
//   GET /api/v1/legal/cookies
//
// Versions live in code (NOT in the markdown frontmatter) so that
// consent capture and the public response cannot drift out of sync.
// When a new version of a document ships, update the literal here
// (and the matching version line in the markdown for human readers).
//
// `/pending-reacceptance` is intentionally NOT in this gateway-folded
// version — it requires auth + reads from audit_logs which is owned by
// service.audit. That endpoint stays on the monolith catch-all proxy
// until service.audit grows a `GetConsentHistory` RPC.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyInstance } from 'fastify';

export const TERMS_VERSION = '2026-05-10-v1';
export const PRIVACY_VERSION = '2026-05-10-v1';
export const COOKIES_VERSION = '2026-05-10-v1';

export type LegalRoutesOptions = {
  // Absolute path to the directory holding terms.md / privacy.md /
  // cookies.md. Tests pass a fixture path; the boot path defaults to
  // the LEGAL_DOCS_DIR env var (set in docker-compose to mount the
  // repo's /docs/legal directory) or `<cwd>/docs/legal` for native dev.
  docsDir: string;
};

type LegalDocument = {
  version: string;
  contentType: 'text/markdown';
  content: string;
};

// Module-level cache — the markdown files are tiny and immutable
// between deploys, so re-reading on every request is wasteful. A
// single Promise per file dedupes concurrent first-loads.
const cache = new Map<string, Promise<string>>();

const readMarkdownCached = (docsDir: string, filename: string): Promise<string> => {
  const key = path.join(docsDir, filename);
  const existing = cache.get(key);
  if (existing) {
    return existing;
  }
  const p = readFile(key, 'utf8');
  cache.set(key, p);
  // Bust the cache on read failure so a transient FS error doesn't
  // sticky-block subsequent requests.
  p.catch(() => cache.delete(key));
  return p;
};

const getTermsDocument = async (docsDir: string): Promise<LegalDocument> => ({
  version: TERMS_VERSION,
  contentType: 'text/markdown',
  content: await readMarkdownCached(docsDir, 'terms.md'),
});

const getPrivacyDocument = async (docsDir: string): Promise<LegalDocument> => ({
  version: PRIVACY_VERSION,
  contentType: 'text/markdown',
  content: await readMarkdownCached(docsDir, 'privacy.md'),
});

const getCookiesDocument = async (docsDir: string): Promise<LegalDocument> => ({
  version: COOKIES_VERSION,
  contentType: 'text/markdown',
  content: await readMarkdownCached(docsDir, 'cookies.md'),
});

export const registerLegalRoutes = async (
  app: FastifyInstance,
  opts: LegalRoutesOptions
): Promise<void> => {
  const { docsDir } = opts;

  app.get(
    '/api/v1/legal/terms',
    {
      schema: {
        tags: ['legal'],
        summary: 'Return the current terms of service document',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  version: { type: 'string' },
                  contentType: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
          },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        const doc = await getTermsDocument(docsDir);
        return reply.send({ data: doc });
      } catch {
        return reply.code(500).send({ error: 'legal content unavailable' });
      }
    }
  );

  app.get(
    '/api/v1/legal/privacy',
    {
      schema: {
        tags: ['legal'],
        summary: 'Return the current privacy policy document',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  version: { type: 'string' },
                  contentType: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
          },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        const doc = await getPrivacyDocument(docsDir);
        return reply.send({ data: doc });
      } catch {
        return reply.code(500).send({ error: 'legal content unavailable' });
      }
    }
  );

  app.get(
    '/api/v1/legal/cookies',
    {
      schema: {
        tags: ['legal'],
        summary: 'Return the current cookie policy document',
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  version: { type: 'string' },
                  contentType: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
          },
          500: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (_req, reply) => {
      try {
        const doc = await getCookiesDocument(docsDir);
        return reply.send({ data: doc });
      } catch {
        return reply.code(500).send({ error: 'legal content unavailable' });
      }
    }
  );
};

// Exposed for tests so they can clear cached fixture reads between
// cases without spinning up a fresh Fastify instance per test.
export const __resetLegalCacheForTests = (): void => {
  cache.clear();
};
