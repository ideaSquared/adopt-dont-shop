import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COOKIES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
  __resetLegalCacheForTests,
  registerLegalRoutes,
} from './legal.js';

const FIXTURE_TERMS = '# Terms\n\nThese are the test terms.\n';
const FIXTURE_PRIVACY = '# Privacy\n\nThese are the test privacy notes.\n';
const FIXTURE_COOKIES = '# Cookies\n\nThese are the test cookies notes.\n';

async function makeFixtureDir(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'gateway-legal-'));
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, 'terms.md'), FIXTURE_TERMS, 'utf8');
  await writeFile(path.join(root, 'privacy.md'), FIXTURE_PRIVACY, 'utf8');
  await writeFile(path.join(root, 'cookies.md'), FIXTURE_COOKIES, 'utf8');
  return root;
}

describe('GET /api/v1/legal/* — gateway-folded legal content', () => {
  let app: FastifyInstance;
  let docsDir: string;

  beforeEach(async () => {
    __resetLegalCacheForTests();
    docsDir = await makeFixtureDir();
    app = Fastify({ logger: false });
    await registerLegalRoutes(app, { docsDir });
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves /terms with the canonical version + markdown payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/legal/terms' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      data: {
        version: TERMS_VERSION,
        contentType: 'text/markdown',
        content: FIXTURE_TERMS,
      },
    });
  });

  it('serves /privacy with the privacy version + markdown', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/legal/privacy' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.version).toBe(PRIVACY_VERSION);
    expect(JSON.parse(res.body).data.content).toBe(FIXTURE_PRIVACY);
  });

  it('serves /cookies with the cookies version + markdown', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/legal/cookies' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.version).toBe(COOKIES_VERSION);
    expect(JSON.parse(res.body).data.content).toBe(FIXTURE_COOKIES);
  });

  it('returns 500 when a markdown file is missing', async () => {
    __resetLegalCacheForTests();
    const empty = path.join(docsDir, 'nonexistent');
    const brokenApp = Fastify({ logger: false });
    await registerLegalRoutes(brokenApp, { docsDir: empty });
    const res = await brokenApp.inject({ method: 'GET', url: '/api/v1/legal/terms' });
    expect(res.statusCode).toBe(500);
    await brokenApp.close();
  });
});
