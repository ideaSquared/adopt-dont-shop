// Application documents — gateway routes (Stage B finish, ADR 0002).
//
// The applications service owns document METADATA (proto RPCs from #945);
// file BYTES are stored by the gateway via @adopt-dont-shop/storage and
// the resulting URL is then recorded via AddDocument. The frontend
// (lib.applications) sends multipart/form-data with a `file` part + a
// `type` text part; reads are { data: Document[] } / 204 on delete.
//
// AV scanning is OUT OF SCOPE here — the storage package documented this
// as a follow-up; the gateway uploads bytes straight to the configured
// storage provider. Wire an AV step in front of `uploadFile` when the
// scanner is extracted.

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { createStorageProvider, type StorageConfig } from '@adopt-dont-shop/storage';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import { documentToView } from './applications-view.js';

export type ApplicationDocumentsRoutesOptions = {
  client: ApplicationsClient;
  storage: StorageConfig;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.UNIMPLEMENTED]: 501,
  [status.INTERNAL]: 500,
};

export const registerApplicationDocumentsRoutes = async (
  app: FastifyInstance,
  opts: ApplicationDocumentsRoutesOptions
): Promise<void> => {
  const { client, storage: storageConfig } = opts;
  const provider = createStorageProvider(storageConfig);

  // POST /:id/documents — multipart upload. Stores bytes, then registers
  // metadata via AddDocument. `file` is the file part; `type` is a text
  // field carrying the document category (e.g. "id_verification").
  app.post<{ Params: { id: string } }>('/api/v1/applications/:id/documents', async (req, reply) => {
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
  });

  // GET /:id/documents → { data: Document[] }. The frontend's getDocuments
  // helper unwraps `data` (defaulting to [] if absent).
  app.get<{ Params: { id: string } }>('/api/v1/applications/:id/documents', async (req, reply) => {
    try {
      const res = await client.listDocuments({ applicationId: req.params.id }, buildMetadata(req));
      return reply.send({ data: res.documents.map(documentToView) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // DELETE /:id/documents/:docId → 204. The service soft-deletes the row;
  // bytes stay (cleanup is a separate retention job — not in scope).
  app.delete<{ Params: { id: string; docId: string } }>(
    '/api/v1/applications/:id/documents/:docId',
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

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
