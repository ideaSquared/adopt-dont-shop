// Application documents — gateway routes (Stage B finish, ADR 0002).
//
// The applications service owns document METADATA (proto RPCs from #945);
// file BYTES are stored by the gateway via @adopt-dont-shop/storage and
// the resulting URL is then recorded via AddDocument. The frontend
// (lib.applications) sends multipart/form-data with a `file` part + a
// `type` text part; reads are { data: Document[] } / 204 on delete.
//
// Content verification (ADS-848): beyond the client-supplied MIME +
// extension allowlists, every document is magic-byte sniffed (rejecting a
// type that contradicts the declared one) and any image is dimension-capped
// (image-bomb guard) before the bytes are written to storage. See
// verifyUploadContent in upload-content-checks.ts.
// TODO(ADS-848 step 3): AV scanning — wire a scanBytes() chokepoint in front
// of provider.uploadFile once the clamd-backed lib.av-scan package lands.
//
// Access control (ADS-1034): `documents` is a private category — adoption
// application documents (ID photos, proof of address) must never be
// fetchable from a raw storage/CloudFront URL. Only the storage KEY
// (`documents/<filename>`) is persisted via AddDocument; every read mints a
// fresh short-lived signed URL (`/uploads-signed/*`, see uploads.ts) instead
// of returning that key directly. Authorization itself is already enforced
// one layer up — service.applications' AddDocument/ListDocuments RPCs deny
// callers who are neither the owning adopter nor rescue staff scoped to the
// owning rescue (see services/applications/src/grpc/document-handlers.ts) —
// so a signed URL is only ever minted for an already-authorized caller.
// Without a signing secret configured we fail closed (503) rather than fall
// back to an unsigned/raw URL, matching the signed-serve route's own
// refusal behaviour in uploads.ts.
//
// Deferred (out of scope for this change): documents uploaded BEFORE this
// fix have their `url` persisted in the old raw-path/raw-S3-URL format, not
// the bare storage-key format this change writes going forward. Signing
// those legacy values would not produce a resolvable /uploads-signed/ link.
// Backfilling them is a data migration owned by service.applications (which
// owns the `documents` table) and is tracked separately — it's out of this
// gateway-only change's blast radius. In the interim they are still safe:
// nginx.prod.conf now denies all direct requests under /uploads/documents/,
// so legacy documents simply fail to load rather than being exposed.

import { extname } from 'node:path';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { createStorageProvider, type StorageConfig } from '@adopt-dont-shop/storage';

import { verifyUploadContent } from './upload-content-checks.js';
import { computeUploadSignature } from './uploads.js';

// Allowed MIME types for application documents. Narrower than image
// uploads: PDF, common images (ID photos), and Word docs cover all
// legitimate use cases without admitting executables, HTML (XSS risk),
// archives, or polyglot files. Exported so any downstream serve route
// can enforce the same allowlist on Content-Type rather than
// re-specifying it.
export const ALLOWED_DOCUMENT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// Extension → allowed MIME. Second check so a lying Content-Type can't
// smuggle a disallowed file through the MIME check alone.
const ALLOWED_EXTENSIONS = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import { documentToView } from './applications-view.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';

export type ApplicationDocumentsRoutesOptions = {
  client: ApplicationsClient;
  storage: StorageConfig;
  // HMAC secret for minting /uploads-signed URLs (ADS-1034). Shared with
  // uploads.ts's signed-serve route. When unset, routes that would expose a
  // document URL refuse the request (503) — see the module comment above.
  signingSecret?: string;
};

// Per-route rate limit (ADS-848). The upload POST reads the multipart body
// into memory, writes the bytes to storage and then calls the applications
// service, so cap it explicitly at the route — the same defence-in-depth the
// image upload route applies — rather than relying solely on the global
// limiter registered in server.ts.
const DOCUMENT_UPLOAD_RATE_LIMIT = { max: 20, timeWindow: '1 minute' } as const;

// Signed-URL lifetime for document links (ADS-1034). Matches the presigned
// S3 redirect TTL in uploads.ts — long enough to load a viewer/download,
// short enough that a leaked link doesn't stay valid indefinitely.
const DOCUMENT_SIGNED_URL_TTL_SECONDS = 5 * 60;

// Mint a fresh signed URL over a storage key (`documents/<filename>`). Keys
// are never returned to the client directly — only ever wrapped in this.
function signDocumentUrl(storageKey: string, secret: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + DOCUMENT_SIGNED_URL_TTL_SECONDS;
  const signature = computeUploadSignature(storageKey, expiresAt, secret);
  return `/uploads-signed/${expiresAt}/${signature}/${storageKey}`;
}

export const registerApplicationDocumentsRoutes = async (
  app: FastifyInstance,
  opts: ApplicationDocumentsRoutesOptions
): Promise<void> => {
  const { client, storage: storageConfig } = opts;
  const provider = createStorageProvider(storageConfig);

  // POST /:id/documents — multipart upload. Stores bytes, then registers
  // metadata via AddDocument. `file` is the file part; `type` is a text
  // field carrying the document category (e.g. "id_verification").
  app.post<{ Params: { id: string } }>(
    '/api/v1/applications/:id/documents',
    {
      config: { rateLimit: DOCUMENT_UPLOAD_RATE_LIMIT },
      schema: {
        tags: ['applications'],
        summary: 'Upload a document for an application (multipart/form-data)',
        response: {
          201: {
            type: 'object',
            properties: { data: { type: 'object', additionalProperties: true } },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          500: { type: 'object', properties: { error: { type: 'string' } } },
          503: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      if (!principalUserId(req)) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      if (typeof (req as { isMultipart?: () => boolean }).isMultipart !== 'function') {
        return reply.code(500).send({ error: 'multipart support not registered' });
      }

      // ADS-1034: fail closed rather than persist a document with no way to
      // ever mint a usable URL for it. An empty/whitespace-only secret must
      // also be rejected — signing with it would produce forgeable
      // signatures, matching uploads.ts's `if (!opts.signingSecret)` guard.
      const { signingSecret } = opts;
      if (!signingSecret || signingSecret.trim() === '') {
        return reply.code(503).send({ error: 'Signed document URLs not configured' });
      }

      let filename = '';
      let mimetype = '';
      let buffer: Buffer | null = null;
      let docType = '';

      try {
        const parts = (req as unknown as { parts: () => AsyncIterable<MultipartPart> }).parts();
        for await (const part of parts) {
          if (part.type === 'file') {
            filename = part.filename ?? '';
            mimetype = part.mimetype ?? 'application/octet-stream';
            buffer = await part.toBuffer();
          } else if (part.type === 'field' && part.fieldname === 'type') {
            docType = typeof part.value === 'string' ? part.value : '';
          }
        }
      } catch (err) {
        return reply.code(400).send({ error: `multipart parse failed: ${(err as Error).message}` });
      }

      if (buffer === null || filename === '') {
        return reply.code(400).send({ error: 'a file part is required' });
      }
      if (docType === '') {
        return reply.code(400).send({ error: 'a `type` field is required' });
      }

      if (!ALLOWED_DOCUMENT_MIME.has(mimetype)) {
        return reply.code(400).send({ error: `File type ${mimetype} is not allowed` });
      }

      const ext = extname(filename).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return reply.code(400).send({ error: `File extension ${ext || '(none)'} is not allowed` });
      }

      // Magic-byte + image-bomb verification (ADS-848). Runs against the actual
      // bytes, so a spoofed Content-Type / extension can't smuggle a mismatched
      // file (or a decompression bomb) past the allowlists above.
      const verification = await verifyUploadContent({
        buffer,
        declaredMime: mimetype,
        extension: ext,
        allowedMimes: ALLOWED_DOCUMENT_MIME,
      });
      if (!verification.ok) {
        return reply.code(400).send({ error: verification.error });
      }

      let upload;
      try {
        upload = await provider.uploadFile(buffer, filename, mimetype, 'documents');
      } catch (err) {
        return reply.code(500).send({ error: `storage write failed: ${(err as Error).message}` });
      }

      // ADS-1034: persist the storage KEY, not `upload.url` — for `documents`
      // that's a raw, directly-fetchable storage/CloudFront URL. The key is
      // resolved to a signed URL on every read instead (see signDocumentUrl).
      const storageKey = `documents/${upload.filename}`;

      try {
        const res = await client.addDocument(
          {
            applicationId: req.params.id,
            type: docType,
            filename: upload.filename,
            url: storageKey,
            size: upload.size,
            mimeType: mimetype,
          },
          buildMetadata(req)
        );
        if (res.document === undefined) {
          return reply.code(500).send({ error: 'addDocument returned no document' });
        }
        const view = documentToView(res.document);
        return reply
          .code(201)
          .send({ data: { ...view, url: signDocumentUrl(view.url, signingSecret) } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /:id/documents → { data: Document[] }. The frontend's getDocuments
  // helper unwraps `data` (defaulting to [] if absent).
  app.get<{ Params: { id: string } }>(
    '/api/v1/applications/:id/documents',
    {
      schema: {
        tags: ['applications'],
        summary: 'List documents for an application',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          503: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      // ADS-1034: without a signing secret there is no safe URL to hand
      // back for a private-category document — fail closed. An empty/
      // whitespace-only secret is rejected too (see the POST handler above).
      const { signingSecret } = opts;
      if (!signingSecret || signingSecret.trim() === '') {
        return reply.code(503).send({ error: 'Signed document URLs not configured' });
      }

      try {
        const res = await client.listDocuments(
          { applicationId: req.params.id },
          buildMetadata(req)
        );
        const data = res.documents
          .map(documentToView)
          .map(view => ({ ...view, url: signDocumentUrl(view.url, signingSecret) }));
        return reply.send({ data });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /:id/documents/:docId → 204. The service soft-deletes the row;
  // bytes stay (cleanup is a separate retention job — not in scope).
  app.delete<{ Params: { id: string; docId: string } }>(
    '/api/v1/applications/:id/documents/:docId',
    {
      schema: {
        tags: ['applications'],
        summary: 'Delete a document from an application',
        params: {
          type: 'object',
          properties: { id: { type: 'string' }, docId: { type: 'string' } },
          required: ['id', 'docId'],
        },
        response: {
          204: { type: 'null' },
          400: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, reply) => {
      try {
        await client.removeDocument(
          { applicationId: req.params.id, documentId: req.params.docId },
          buildMetadata(req)
        );
        return reply.code(204).send();
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

// x-user-id is stamped by the authenticate middleware after a validated
// ValidateToken call, which strips any client-supplied value first (see
// middleware/authenticate.ts's SPOOFABLE_HEADERS strip) — provided that
// middleware runs in front of this route. Its absence means the request
// carried no valid principal, so the route must reject before writing
// bytes to storage (ADS-1035).
function principalUserId(req: FastifyRequest): string | null {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers['x-user-id'];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

// Thin multipart-part shape — kept loose so this module doesn't take a
// hard dep on @fastify/multipart's own types at the type level. The
// fields used (type, filename, mimetype, toBuffer, fieldname, value) are
// stable across recent @fastify/multipart versions.
type MultipartPart = {
  type: 'file' | 'field';
  filename?: string;
  mimetype?: string;
  fieldname?: string;
  value?: unknown;
  toBuffer: () => Promise<Buffer>;
};
