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
//   - addDocument / removeDocument: gate APPLICATIONS_UPDATE (same plain
//     gate the write handlers use; the rescue owns the application).
//   - listDocuments: gate APPLICATIONS_VIEW with the SAME owner / rescue /
//     admin scoping as getApplication — read the application's user_id /
//     rescue_id from the read model, then adopter-owns OR rescue-staff-of-
//     this-rescue OR admin.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import {
  APPLICATIONS_UPDATE,
  APPLICATIONS_VIEW,
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

// --- AddDocument -----------------------------------------------------

export async function addDocument(
  deps: HandlerDeps,
  principal: Principal,
  req: AddDocumentRequest
): Promise<AddDocumentResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

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
  const owner = await deps.pool.query<OwnerRow>(
    `SELECT user_id, rescue_id FROM applications WHERE application_id = $1 AND deleted_at IS NULL`,
    [req.applicationId]
  );
  if (owner.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', 'application not found');
  }

  const { user_id, rescue_id } = owner.rows[0];
  const canRead =
    requirePermission(principal, APPLICATIONS_VIEW, { userId: user_id as UserId }) ||
    requirePermission(principal, APPLICATIONS_VIEW, { rescueId: rescue_id as RescueId });
  if (!canRead) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required`);
  }

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
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  if (req.documentId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'document_id is required');
  }

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
