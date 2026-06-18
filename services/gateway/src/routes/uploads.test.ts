import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  computeUploadSignature,
  registerUploadsRoutes,
  sanitizeDisplayFilename,
} from './uploads.js';

const SECRET = 'test-secret-12345';

// Genuine image bytes so the ADS-848 magic-byte + dimension checks run
// against real content rather than fabricated headers.
const makeJpeg = (width = 8, height = 8): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: { r: 9, g: 9, b: 9 } } })
    .jpeg()
    .toBuffer();

async function buildApp(tmp: string, secret?: string): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const { default: multipart } = await import('@fastify/multipart');
  await app.register(multipart, { limits: { fileSize: 1_000_000, files: 1 } });
  await registerUploadsRoutes(app, {
    storage: {
      provider: 'local',
      local: { directory: tmp, publicPath: '/uploads' },
      s3: {},
    },
    signingSecret: secret,
  });
  return app;
}

function multipartBody(boundary: string, file: Buffer, filename: string, mime: string): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
        `Content-Type: ${mime}\r\n\r\n`,
      'utf8'
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ]);
}

describe('POST /api/v1/uploads/images', () => {
  let app: FastifyInstance;
  let tmp: string;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'ads-uploads-'));
    app = await buildApp(tmp, SECRET);
  });

  afterEach(async () => {
    await app.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns the monolith response shape on a valid JPEG upload', async () => {
    const boundary = 'b1';
    const body = multipartBody(boundary, await makeJpeg(), 'cat.jpg', 'image/jpeg');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json() as Record<string, unknown>;
    expect(json.url).toMatch(/\/uploads\/pets\//);
    expect(json.thumbnail_url).toBe(json.url);
    expect(json.original_filename).toBe('file.jpg');
    expect(json.size_bytes).toBeGreaterThan(0);
    expect(json.content_type).toBe('image/jpeg');
  });

  it('rejects disallowed MIME types with 400', async () => {
    const boundary = 'b2';
    const body = multipartBody(boundary, Buffer.from('<svg/>'), 'x.svg', 'image/svg+xml');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringContaining('image/svg+xml') });
  });

  it('rejects a disallowed extension even when the MIME is allowed', async () => {
    const boundary = 'b2e';
    // A lying Content-Type (image/png) carrying an executable extension.
    const body = multipartBody(boundary, Buffer.from('MZ'), 'payload.exe', 'image/png');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringContaining('.exe') });
  });

  it('returns 400 when no file part is present', async () => {
    const boundary = 'b3';
    const body = Buffer.from(`--${boundary}--\r\n`, 'utf8');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'No file uploaded' });
  });

  it('sanitises the display filename — PII in original_filename is stripped', async () => {
    const boundary = 'b4';
    const body = multipartBody(
      boundary,
      await makeJpeg(),
      'Jane_Doe_Passport_123456.jpg',
      'image/jpeg'
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(200);
    expect((res.json() as Record<string, unknown>).original_filename).toBe('file.jpg');
  });

  it('rejects content whose magic bytes contradict the declared image type (ADS-848)', async () => {
    const boundary = 'b5';
    // A real PDF body, uploaded with a .png name + image/png Content-Type.
    const pdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\n', 'binary');
    const body = multipartBody(boundary, pdf, 'not-really.png', 'image/png');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/content does not match/i);
  });

  it('rejects an image whose dimensions exceed the bomb-guard cap (ADS-848)', async () => {
    const boundary = 'b6';
    // 8000x8000 = 64 MP > the 50 MP default cap. A flat-colour JPEG of these
    // dimensions is only a few hundred KB, so it clears the multipart size
    // limit and the rejection is purely the dimension guard.
    const big = await makeJpeg(8000, 8000);
    const body = multipartBody(boundary, big, 'huge.jpg', 'image/jpeg');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/dimensions/i);
  });
});

describe('GET /uploads-signed/:expiresAt/:signature/*', () => {
  let app: FastifyInstance;
  let tmp: string;

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'ads-uploads-'));
    mkdirSync(join(tmp, 'pets'), { recursive: true });
    writeFileSync(join(tmp, 'pets', 'kitten.jpg'), Buffer.from('\xff\xd8\xffjpeg'));
    app = await buildApp(tmp, SECRET);
  });

  afterEach(async () => {
    await app.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  it('streams the file when signature + expiry are valid', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const filePath = 'pets/kitten.jpg';
    const signature = computeUploadSignature(filePath, expiresAt, SECRET);

    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/${signature}/${filePath}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('private, max-age=300');
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });

  it('returns 410 when expiresAt has passed', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) - 1;
    const signature = computeUploadSignature('pets/kitten.jpg', expiresAt, SECRET);
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/${signature}/pets/kitten.jpg`,
    });
    expect(res.statusCode).toBe(410);
  });

  it('returns 403 when the signature is wrong', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = computeUploadSignature('pets/kitten.jpg', expiresAt, 'wrong-secret');
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/${signature}/pets/kitten.jpg`,
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 403 when the signature length differs from the expected hex digest', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/deadbeef/pets/kitten.jpg`,
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects path traversal attempts even with a valid signature', async () => {
    // Write a sibling file outside the upload dir we should never reach.
    const sibling = mkdtempSync(join(tmpdir(), 'ads-sibling-'));
    writeFileSync(join(sibling, 'secret.txt'), 'leaked');
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + 60;
      const filePath = '../../etc/passwd';
      const signature = computeUploadSignature(filePath, expiresAt, SECRET);
      const res = await app.inject({
        method: 'GET',
        url: `/uploads-signed/${expiresAt}/${signature}/${filePath}`,
      });
      // Either Fastify path normalisation drops the traversal before the
      // route matches (404) or safeResolve rejects it (400). What matters
      // for the security property is the response is NEVER 200.
      expect(res.statusCode).not.toBe(200);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });

  it('returns 404 when the file does not exist on disk', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const filePath = 'pets/missing.jpg';
    const signature = computeUploadSignature(filePath, expiresAt, SECRET);
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/${signature}/${filePath}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when the resolved path is a directory, not a file', async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const filePath = 'pets';
    const signature = computeUploadSignature(filePath, expiresAt, SECRET);
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/${expiresAt}/${signature}/${filePath}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 503 when no signing secret is configured', async () => {
    await app.close();
    app = await buildApp(tmp, undefined);
    const res = await app.inject({
      method: 'GET',
      url: `/uploads-signed/9999999999/deadbeef/pets/kitten.jpg`,
    });
    expect(res.statusCode).toBe(503);
  });
});

describe('sanitizeDisplayFilename', () => {
  it('strips the basename and keeps a normalised extension', () => {
    expect(sanitizeDisplayFilename('Jane Doe Passport.PDF')).toBe('file.pdf');
    expect(sanitizeDisplayFilename('cat.jpeg')).toBe('file.jpeg');
  });

  it('falls back to .bin when the original has no extension', () => {
    expect(sanitizeDisplayFilename('no-extension-here')).toBe('file.bin');
  });

  it('drops disallowed characters from the extension', () => {
    expect(sanitizeDisplayFilename('weird.PDF?query=1')).toBe('file.pdfquery1');
  });
});
