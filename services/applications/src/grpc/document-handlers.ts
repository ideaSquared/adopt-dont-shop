// gRPC handlers — application document METADATA (read + write).
//
// Document rows reference a file already stored in object storage (the
// gateway owns the multipart upload + storage); this surface only
// persists / reads / soft-deletes the metadata row. Mirrors the SPA's
// Document shape.
//
// All three run OUTSIDE a transaction (straight off deps.pool) — a
// single INSERT / SELECT / UPDATE each.
//
// Authz:
//   - addDocument / removeDocument: APPLICATIONS_UPDATE scoped to the
//     application's owner / rescue — read the application's user_id /
//     rescue_id from the read model first (404 if it doesn't exist), then
//     adopter-owns OR rescue-staff-of-this-rescue OR admin. A bare
//     permission check would let any rescue attach to / delete another
//     rescue's application documents.
//   - listDocuments: gate APPLICATIONS_VIEW with the SAME owner / rescue /
//     admin scoping as getApplication.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import {
  APPLICATIONS_UPDATE,
  APPLICATIONS_VIEW,
  type Permission,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import type {
  AddDocumentRequest,
  AddDocumentResponse,
  Document,
  ListDocumentsRequest,
  ListDocumentsResponse,
  RemoveDocumentRequest,
  RemoveDocumentResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

// A document metadata row as stored. size / mime_type / uploaded_by are
// nullable; created_at is the canonical upload timestamp.
type DocumentRow = {
  document_id: string;
  application_id: string;
  type: string;
  filename: string;
  url: string;
  size: number | null;
  mime_type: string | null;
  created_at: Date;
};

// The slice of the applications read model needed to scope a read.
type OwnerRow = {
  user_id: string;
  rescue_id: string;
};

function rowToProto(row: DocumentRow): Document {
  const doc: Document = {
    documentId: row.document_id,
    applicationId: row.application_id,
    type: row.type,
    filename: row.filename,
    url: row.url,
    uploadedAt: row.created_at.toISOString(),
  };
  if (row.size !== null) {
    doc.size = row.size;
  }
  if (row.mime_type !== null) {
    doc.mimeType = row.mime_type;
  }
  return doc;
}

// Load the application's owner / rescue, 404 if it doesn't exist. Shared by
// every document handler so a write can't target an application that isn't
// there (and can't skip the scope check below).
async function loadOwnerOrThrow(deps: HandlerDeps, applicationId: string): Promise<OwnerRow> {
  const { rows } = await deps.pool.query<OwnerRow>(
    `SELECT user_id, rescue_id FROM applications WHERE application_id = $1 AND deleted_at IS NULL`,
    [applicationId]
  );
  if (rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'application not found');
  }
  return rows[0];
}

// adopter-owns OR rescue-staff-of-this-rescue OR admin — the same OR-scope
// getApplication uses, applied to a document read/write.
function assertOwnerOrRescue(principal: Principal, owner: OwnerRow, permission: Permission): void {
  const ok =
    requirePermission(principal, permission, { userId: owner.user_id as UserId }) ||
    requirePermission(principal, permission, { rescueId: owner.rescue_id as RescueId });
  if (!ok) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

// Document URLs must reference either same-origin local storage (a
// relative path — how STORAGE_PROVIDER=local, the dev/CI default, serves
// uploads: packages/storage's local provider returns `${publicPath}/...`)
// or the platform's own storage / CDN host — never an arbitrary scheme
// (`javascript:`, `data:`, ...) or an attacker-controlled https host that
// would turn a "document link" in the reviewer UI into a phishing / XSS
// vector (ADS-930). The host allowlist tracks the same env vars
// packages/storage's S3 provider uses to build public URLs, so it stays
// correct as storage config changes without a second source of truth.
function allowedDocumentHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const hosts = new Set<string>();
  const cloudFrontDomain = env.CLOUDFRONT_DOMAIN?.trim();
  if (cloudFrontDomain) {
    hosts.add(cloudFrontDomain);
  }
  const bucket = env.S3_BUCKET_NAME?.trim();
  if (bucket) {
    const region = env.S3_REGION?.trim() || 'us-east-1';
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return hosts;
}

function assertValidDocumentUrl(url: string): void {
  // `//host/...` is protocol-relative — browsers resolve it off-origin, so
  // it's excluded from the same-origin relative-path allowance below.
  if (url.startsWith('/') && !url.startsWith('//')) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'url must be https or a platform-relative path');
  }
  if (parsed.protocol !== 'https:') {
    throw new HandlerError('INVALID_ARGUMENT', 'url must be https or a platform-relative path');
  }
  if (!allowedDocumentHosts().has(parsed.host)) {
    throw new HandlerError('INVALID_ARGUMENT', 'url must point to platform storage');
  }
}

// --- AddDocument -----------------------------------------------------

export async function addDocument(
  deps: HandlerDeps,
  principal: Principal,
  req: AddDocumentRequest
): Promise<AddDocumentResponse> {
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  assertValidDocumentUrl(req.url);
  const owner = await loadOwnerOrThrow(deps, req.applicationId);
  assertOwnerOrRescue(principal, owner, APPLICATIONS_UPDATE);

  const sql = `
    INSERT INTO application_documents
      (document_id, application_id, type, filename, url, size, mime_type, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING document_id, application_id, type, filename, url, size, mime_type, created_at
  `;
  const params = [
    randomUUID(),
    req.applicationId,
    req.type,
    req.filename,
    req.url,
    req.size ?? null,
    req.mimeType ?? null,
    principal.userId,
  ];

  const { rows } = await deps.pool.query<DocumentRow>(sql, params);

  return { document: rowToProto(rows[0]) };
}

// --- ListDocuments ---------------------------------------------------

export async function listDocuments(
  deps: HandlerDeps,
  principal: Principal,
  req: ListDocumentsRequest
): Promise<ListDocumentsResponse> {
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  // Scope from the application's owner / rescue — the read model row.
  const owner = await loadOwnerOrThrow(deps, req.applicationId);
  assertOwnerOrRescue(principal, owner, APPLICATIONS_VIEW);

  const { rows } = await deps.pool.query<DocumentRow>(
    `SELECT document_id, application_id, type, filename, url, size, mime_type, created_at
       FROM application_documents
      WHERE application_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC`,
    [req.applicationId]
  );

  return { documents: rows.map(rowToProto) };
}

// --- RemoveDocument --------------------------------------------------

export async function removeDocument(
  deps: HandlerDeps,
  principal: Principal,
  req: RemoveDocumentRequest
): Promise<RemoveDocumentResponse> {
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  if (req.documentId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'document_id is required');
  }
  const owner = await loadOwnerOrThrow(deps, req.applicationId);
  assertOwnerOrRescue(principal, owner, APPLICATIONS_UPDATE);

  const { rowCount } = await deps.pool.query(
    `UPDATE application_documents
        SET deleted_at = now()
      WHERE document_id = $1 AND application_id = $2 AND deleted_at IS NULL`,
    [req.documentId, req.applicationId]
  );
  if (rowCount === 0) {
    throw new HandlerError('NOT_FOUND', 'document not found');
  }

  return {};
}
