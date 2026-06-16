import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import {
  ALLOWED_DOCUMENT_MIME,
  registerApplicationDocumentsRoutes,
} from './application-documents.js';

function makeClient(): {
  client: ApplicationsClient;
  mocks: {
    addDocument: ReturnType<typeof vi.fn>;
    listDocuments: ReturnType<typeof vi.fn>;
    removeDocument: ReturnType<typeof vi.fn>;
  };
} {
  const mocks = {
    addDocument: vi.fn(),
    listDocuments: vi.fn(),
    removeDocument: vi.fn(),
  };
  const client = mocks as unknown as ApplicationsClient;
  return { client, mocks };
}

const ADOPTER = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'adopter',
  'x-user-permissions': 'applications.update,applications.read',
};

const DOC = {
  documentId: 'doc-1',
  applicationId: 'app-1',
  type: 'id_verification',
  filename: 'aaa.pdf',
  url: '/uploads/documents/aaa.pdf',
  uploadedAt: '2026-06-06T12:00:00.000Z',
  size: 1234,
  mimeType: 'application/pdf',
};

describe('application document routes', () => {
  let app: FastifyInstance;
  let tmp: string;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'ads-docs-'));
    const { client, mocks: m } = makeClient();
    mocks = m;

    app = Fastify({ logger: false });
    // The multipart plugin is registered by server.ts in real boot; for
    // these route tests we register it here so POST can parse the body.
    const { default: multipart } = await import('@fastify/multipart');
    await app.register(multipart, { limits: { fileSize: 1_000_000, files: 1 } });
    await registerApplicationDocumentsRoutes(app, {
      client,
      storage: {
        provider: 'local',
        local: { directory: tmp, publicPath: '/uploads' },
        s3: {},
      },
    });
  });

  afterEach(async () => {
    await app.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  function multipartBody(
    boundary: string,
    file: Buffer,
    filename: string,
    type: string,
    mimeType = 'application/pdf'
  ): Buffer {
    const enc = (s: string): Buffer => Buffer.from(s, 'utf8');
    return Buffer.concat([
      enc(
        `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n${type}\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: ${mimeType}\r\n\r\n`
      ),
      file,
      enc(`\r\n--${boundary}--\r\n`),
    ]);
  }

  it('POST uploads bytes, calls AddDocument, returns { data: view } with id renamed', async () => {
    mocks.addDocument.mockResolvedValue({ document: DOC });
    const boundary = 'boundary123';
    const body = multipartBody(
      boundary,
      Buffer.from('%PDF-1.4 hello'),
      'aaa.pdf',
      'id_verification'
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const json = res.json() as { data: { id: string; type: string; mimeType: string } };
    expect(json.data.id).toBe('doc-1');
    expect(json.data.type).toBe('id_verification');
    expect(json.data.mimeType).toBe('application/pdf');

    // AddDocument was called with the application id + storage's resolved
    // url/filename/size.
    const [grpcReq] = mocks.addDocument.mock.calls[0];
    expect(grpcReq.applicationId).toBe('app-1');
    expect(grpcReq.type).toBe('id_verification');
    expect(typeof grpcReq.url).toBe('string');
    expect(grpcReq.url).toContain('/uploads/documents/');
    expect(grpcReq.size).toBeGreaterThan(0);
    expect(grpcReq.mimeType).toBe('application/pdf');
  });

  it('POST → 400 when the file part is missing', async () => {
    const boundary = 'b2';
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\nfoo\r\n--${boundary}--\r\n`
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST → 400 when the type field is missing', async () => {
    const boundary = 'b3';
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.pdf"\r\n` +
          `Content-Type: application/pdf\r\n\r\n`
      ),
      Buffer.from('hi'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('GET /:id/documents returns { data: view[] }', async () => {
    mocks.listDocuments.mockResolvedValue({ documents: [DOC] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1/documents',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { data: Array<{ id: string }> };
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('doc-1');
    expect(mocks.listDocuments.mock.calls[0][0]).toEqual({ applicationId: 'app-1' });
  });

  it('DELETE /:id/documents/:docId → 204', async () => {
    mocks.removeDocument.mockResolvedValue({});
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/applications/app-1/documents/doc-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(204);
    expect(mocks.removeDocument.mock.calls[0][0]).toEqual({
      applicationId: 'app-1',
      documentId: 'doc-1',
    });
  });

  it('maps gRPC NOT_FOUND → 404 on remove', async () => {
    mocks.removeDocument.mockRejectedValue({
      code: grpcStatus.NOT_FOUND,
      details: 'document not found',
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/applications/app-1/documents/doc-x',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(404);
  });

  it('maps gRPC PERMISSION_DENIED → 403 on list', async () => {
    mocks.listDocuments.mockRejectedValue({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'nope',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1/documents',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST → 400 when the MIME type is outside the allowlist (text/html)', async () => {
    const boundary = 'b-mime-reject';
    const body = multipartBody(
      boundary,
      Buffer.from('<html><script>alert(1)</script></html>'),
      'evil.html',
      'id_verification',
      'text/html'
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/not allowed/);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST → 400 when the MIME type is outside the allowlist (application/octet-stream)', async () => {
    const boundary = 'b-exe-reject';
    const body = multipartBody(
      boundary,
      Buffer.from('MZ\x90\x00'),
      'malware.exe',
      'id_verification',
      'application/octet-stream'
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/not allowed/);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST → 400 when the extension is disallowed even if MIME claims application/pdf', async () => {
    // Defence-in-depth: a lying Content-Type must not bypass the extension check.
    const boundary = 'b-ext-reject';
    const body = multipartBody(
      boundary,
      Buffer.from('MZ\x90\x00'),
      'malware.exe',
      'id_verification',
      'application/pdf'
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/not allowed/);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST → 400 when magic bytes contradict the declared MIME (ADS-848)', async () => {
    // A real PDF body uploaded while CLAIMING to be a PNG (allowed name +
    // Content-Type). The byte-level sniff must catch the mismatch.
    const boundary = 'b-sniff-mismatch';
    const pdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\n', 'binary');
    const body = multipartBody(boundary, pdf, 'fake.png', 'id_verification', 'image/png');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/content does not match/i);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST → 400 when an image exceeds the dimension bomb-guard cap (ADS-848)', async () => {
    const boundary = 'b-image-bomb';
    // 8000x8000 = 64 MP > the 50 MP default cap; a flat-colour JPEG is small.
    const big = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: { r: 7, g: 7, b: 7 } },
    })
      .jpeg()
      .toBuffer();
    const body = multipartBody(boundary, big, 'huge.jpg', 'id_verification', 'image/jpeg');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toMatch(/dimensions/i);
    expect(mocks.addDocument).not.toHaveBeenCalled();
  });

  it('POST uploads a genuine image whose bytes match the declared type (ADS-848)', async () => {
    mocks.addDocument.mockResolvedValue({
      document: { ...DOC, filename: 'real.jpg', mimeType: 'image/jpeg' },
    });
    const boundary = 'b-genuine-image';
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 7, g: 7, b: 7 } },
    })
      .jpeg()
      .toBuffer();
    const body = multipartBody(boundary, jpeg, 'real.jpg', 'id_verification', 'image/jpeg');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/documents',
      headers: { ...ADOPTER, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    expect(mocks.addDocument).toHaveBeenCalledTimes(1);
  });

  it('ALLOWED_DOCUMENT_MIME export includes pdf and common image types', () => {
    expect(ALLOWED_DOCUMENT_MIME.has('application/pdf')).toBe(true);
    expect(ALLOWED_DOCUMENT_MIME.has('image/jpeg')).toBe(true);
    expect(ALLOWED_DOCUMENT_MIME.has('image/png')).toBe(true);
    expect(ALLOWED_DOCUMENT_MIME.has('text/html')).toBe(false);
    expect(ALLOWED_DOCUMENT_MIME.has('application/octet-stream')).toBe(false);
  });
});
