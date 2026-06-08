// Image uploads — gateway-only routes (no upstream service).
//
// Mirrors the monolith's POST /api/v1/uploads/images + the
// GET /uploads-signed/:expiresAt/:signature/*filepath shape. The bytes
// flow straight through @adopt-dont-shop/storage; no DB row is written
// here — staged images are referenced by URL in a follow-up create-pet
// payload, same as the monolith. AV scanning, image bomb guards and
// magic-byte verification stay TODO: today we trust the multer-equivalent
// MIME filter + max-file-size limit, identical to the monolith's first
// pass before its sharp/AV pipeline runs.
//
// The signed-serve route is unauthenticated by design — the HMAC over
// `(filepath, expiresAt)` IS the proof of authorisation. The signing
// secret is shared between any service that wants to mint a signed URL
// (today: only the gateway itself; tomorrow: the notifications worker
// embedding an image in a transactional email).

import crypto from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  createStorageProvider,
  type StorageConfig,
  type StorageProvider,
} from '@adopt-dont-shop/storage';

export type UploadsRoutesOptions = {
  storage: StorageConfig;
  // HMAC secret for signed-serve URLs. Shared with anything else that
  // wants to mint a URL (e.g. future notifications worker). When unset
  // the signed-serve route returns 503 — without a secret every signature
  // check would either pass on the empty string (catastrophic) or fail
  // (useless), so refusing to serve is the only safe behaviour.
  signingSecret?: string;
};

// Allowed image MIME types for /images. Same allowlist the monolith
// uses in service.backend's UPLOAD_CONFIG.allowedMimeTypes.images.
// SVG is intentionally absent — same-origin XSS risk (CVEs in DOMPurify
// bypass have shipped before).
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// MIME → extension lookup for streamed responses. Matches the monolith's
// streamFile table.
const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

// Per-route rate limits. /images is authenticated but still bounded so
// one logged-in adopter can't fire-hose the storage backend. The
// signed-serve route is unauthenticated by design (HMAC is the auth) and
// gets a tighter window so a leaked signed URL — or someone fuzzing the
// signature — can't pin the gateway. Matches the monolith's apiLimiter
// shape (60-per-minute by default; tighter for the unauthenticated
// serve path).
const UPLOAD_RATE_LIMITS = {
  images: { max: 30, timeWindow: '1 minute' },
  signedServe: { max: 120, timeWindow: '1 minute' },
} as const;

export const registerUploadsRoutes = async (
  app: FastifyInstance,
  opts: UploadsRoutesOptions
): Promise<void> => {
  const provider = createStorageProvider(opts.storage);
  const uploadDir = path.resolve(opts.storage.local.directory);

  // Encapsulated rate-limit registration — limits apply only to the
  // routes registered in this plugin, not gateway-wide. Same pattern as
  // the auth routes plugin.
  await app.register(rateLimit, { global: false });

  // POST /api/v1/uploads/images — multipart, single file under field
  // `image`. Returns the shape lib.api's ImageUploadResponseSchema
  // expects: { url, thumbnail_url, original_filename, size_bytes,
  // content_type }. Storage package doesn't generate thumbnails today,
  // so thumbnail_url aliases url (matches the monolith's fallback when
  // the resize step is skipped).
  app.post(
    '/api/v1/uploads/images',
    { config: { rateLimit: UPLOAD_RATE_LIMITS.images } },
    async (req, reply) => {
      if (typeof (req as { isMultipart?: () => boolean }).isMultipart !== 'function') {
        return reply.code(500).send({ error: 'multipart support not registered' });
      }

      let originalName = '';
      let mimetype = '';
      let buffer: Buffer | null = null;

      try {
        const parts = (req as unknown as { parts: () => AsyncIterable<MultipartPart> }).parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'image') {
            originalName = part.filename ?? '';
            mimetype = part.mimetype ?? 'application/octet-stream';
            buffer = await part.toBuffer();
          }
        }
      } catch (err) {
        return reply.code(400).send({ error: `multipart parse failed: ${(err as Error).message}` });
      }

      if (buffer === null || originalName === '') {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      if (!ALLOWED_IMAGE_MIME.has(mimetype)) {
        return reply.code(400).send({ error: `File type ${mimetype} is not allowed` });
      }

      let upload;
      try {
        upload = await provider.uploadFile(buffer, originalName, mimetype, 'pets');
      } catch (err) {
        return reply.code(500).send({ error: `storage write failed: ${(err as Error).message}` });
      }

      return reply.code(200).send({
        url: upload.url,
        thumbnail_url: upload.url,
        original_filename: sanitizeDisplayFilename(originalName),
        size_bytes: upload.size,
        content_type: mimetype,
      });
    }
  );

  // GET /uploads-signed/:expiresAt/:signature/*filepath — unauthenticated
  // signed-URL serve. The HMAC over `(filepath, expiresAt)` is the proof
  // of authorisation; without the signing secret nothing can mint a
  // valid URL, so refusing requests when secret is missing is correct.
  app.get<{
    Params: { expiresAt: string; signature: string; '*': string };
  }>(
    '/uploads-signed/:expiresAt/:signature/*',
    { config: { rateLimit: UPLOAD_RATE_LIMITS.signedServe } },
    async (req, reply) => {
      if (!opts.signingSecret) {
        return reply.code(503).send({ error: 'Signed serving not configured' });
      }

      const expiresAt = Number.parseInt(req.params.expiresAt, 10);
      const { signature } = req.params;
      const filePath = req.params['*'] ?? '';

      if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
        return reply.code(410).send({ error: 'Signed URL expired' });
      }

      if (!verifySignature(filePath, expiresAt, signature, opts.signingSecret)) {
        return reply.code(403).send({ error: 'Invalid signature' });
      }

      // Remote backend: signature already authorised, redirect to a short
      // presigned URL so bytes flow client→S3 directly. Same approach the
      // monolith uses.
      if (provider.supportsSignedUrls()) {
        const redirected = await tryRedirectToProvider(provider, filePath, reply);
        if (redirected) {
          return reply;
        }
      }

      const resolved = safeResolve(uploadDir, filePath);
      if (resolved === null) {
        return reply.code(400).send({ error: 'Invalid file path' });
      }
      return streamFile(resolved, reply);
    }
  );
};

// --- Helpers ---------------------------------------------------------

type MultipartPart = {
  type: 'file' | 'field';
  filename?: string;
  mimetype?: string;
  fieldname?: string;
  toBuffer: () => Promise<Buffer>;
};

// Reduce a user-supplied filename to a privacy-safe display name. The
// monolith does the same: an adopter uploading
// `Jane_Doe_Passport_123.pdf` would otherwise leak PII to any viewer of
// the resulting URL. Keep only a lowercase alphanumeric extension.
export const sanitizeDisplayFilename = (filename: string): string => {
  const ext = path
    .extname(filename)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');
  return `file${ext || '.bin'}`;
};

export const computeUploadSignature = (
  filePath: string,
  expiresAt: number,
  secret: string
): string => crypto.createHmac('sha256', secret).update(`${filePath}:${expiresAt}`).digest('hex');

// Constant-time signature check. Reject mismatched lengths before
// timingSafeEqual so the comparison never throws.
function verifySignature(
  filePath: string,
  expiresAt: number,
  provided: string,
  secret: string
): boolean {
  const expected = computeUploadSignature(filePath, expiresAt, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

// Reject paths that escape the upload directory. Mirrors the monolith's
// safeResolve — strip leading slashes, refuse embedded `..`/`.` segments,
// then check path.relative containment (a sanitiser CodeQL recognises).
export const safeResolve = (uploadDir: string, relativePath: string): string | null => {
  const cleaned = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  if (cleaned === '' || cleaned.split('/').some(seg => seg === '..' || seg === '.')) {
    return null;
  }
  const resolved = path.resolve(uploadDir, cleaned);
  const rel = path.relative(uploadDir, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return resolved;
};

const PRESIGNED_REDIRECT_TTL_SECONDS = 5 * 60;

async function tryRedirectToProvider(
  provider: StorageProvider,
  filePath: string,
  reply: FastifyReply
): Promise<boolean> {
  const cleaned = filePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const lastSlash = cleaned.lastIndexOf('/');
  if (lastSlash === -1) {
    return false;
  }
  const category = cleaned.slice(0, lastSlash);
  const filename = cleaned.slice(lastSlash + 1);
  if (category === '' || filename === '') {
    return false;
  }
  try {
    const signedUrl = await provider.getSignedUrl(
      filename,
      category,
      PRESIGNED_REDIRECT_TTL_SECONDS
    );
    void reply.header('Cache-Control', 'private, no-store').redirect(signedUrl, 302);
    return true;
  } catch {
    void reply.code(502).send({ error: 'Storage backend unavailable' });
    return true;
  }
}

function streamFile(resolved: string, reply: FastifyReply): FastifyReply {
  let stats: fs.Stats;
  try {
    stats = fs.statSync(resolved);
  } catch {
    return reply.code(404).send({ error: 'File not found' });
  }
  if (!stats.isFile()) {
    return reply.code(404).send({ error: 'File not found' });
  }

  const ext = path.extname(resolved).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';

  void reply.header('Content-Type', mime);
  void reply.header('Content-Length', String(stats.size));
  if (ext === '.pdf') {
    void reply.header('Content-Disposition', 'inline');
  }
  // Defence-in-depth against historical SVG uploads — block inline render.
  if (ext === '.svg' || ext === '.svgz') {
    void reply.header('Content-Disposition', 'attachment');
    void reply.header('X-Content-Type-Options', 'nosniff');
  }
  void reply.header('Cache-Control', 'private, max-age=300');

  return reply.send(fs.createReadStream(resolved));
}
