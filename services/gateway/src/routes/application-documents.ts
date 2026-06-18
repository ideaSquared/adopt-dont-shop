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

import { extname } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { createStorageProvider, type StorageConfig } from '@adopt-dont-shop/storage';

import { verifyUploadContent } from './upload-content-checks.js';

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
};

// Per-route rate limit (ADS-848). The upload POST reads the multipart body
// into memory, writes the bytes to storage and then calls the applications
// service, so cap it explicitly at the route — the same defence-in-depth the
// image upload route applies — rather than relying solely on the global
// limiter registered in server.ts.
const DOCUMENT_UPLOAD_RATE_LIMIT = { max: 20, timeWindow: '1 minute' } as const;

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
      },
    },
    async (req, reply) => {
      if (typeof (req as { isMultipart?: () => boolean }).isMultipart !== 'function') {
        return reply.code(500).send({ error: 'multipart support not registered' });
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

      try {
        const res = await client.addDocument(
          {
            applicationId: req.params.id,
            type: docType,
            filename: upload.filename,
            url: upload.url,
            size: upload.size,
            mimeType: mimetype,
          },
          buildMetadata(req)
        );
        if (res.document === undefined) {
          return reply.code(500).send({ error: 'addDocument returned no document' });
        }
        return reply.code(201).send({ data: documentToView(res.document) });
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
      },
    },
    async (req, reply) => {
      try {
        const res = await client.listDocuments(
          { applicationId: req.params.id },
          buildMetadata(req)
        );
        return reply.send({ data: res.documents.map(documentToView) });
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
