import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { addDocument, listDocuments, removeDocument } from './document-handlers.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    roles: string[];
    permissions: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read', 'applications.update'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof addDocument>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

const documentRow = {
  document_id: 'doc-1',
  application_id: 'app-1',
  type: 'reference',
  filename: 'ref.pdf',
  url: 'https://files/ref.pdf',
  size: 2048,
  mime_type: 'application/pdf',
  created_at: new Date('2026-06-06T10:00:00.000Z'),
};

describe('addDocument', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal({ permissions: ['applications.read'] }), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'https://files/ref.pdf',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: '',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'https://files/ref.pdf',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('inserts the metadata row and returns the mapped Document', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [documentRow] });

    const res = await addDocument(deps, makePrincipal({ userId: 'usr-9' }), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: 'https://files/ref.pdf',
      size: 2048,
      mimeType: 'application/pdf',
    });

    const params = query.mock.calls[0][1] as unknown[];
    // application_id, type, filename, url, size, mime_type, uploaded_by
    expect(params.slice(1)).toEqual([
      'app-1',
      'reference',
      'ref.pdf',
      'https://files/ref.pdf',
      2048,
      'application/pdf',
      'usr-9',
    ]);
    expect(res.document).toEqual({
      documentId: 'doc-1',
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: 'https://files/ref.pdf',
      size: 2048,
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-06T10:00:00.000Z',
    });
  });

  it('persists null for omitted size / mime_type', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({
      rows: [{ ...documentRow, size: null, mime_type: null }],
    });

    const res = await addDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: 'https://files/ref.pdf',
    });

    const params = query.mock.calls[0][1] as unknown[];
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(res.document?.size).toBeUndefined();
    expect(res.document?.mimeType).toBeUndefined();
  });
});

describe('listDocuments', () => {
  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      listDocuments(deps, makePrincipal(), { applicationId: 'missing' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('denies an adopter who is not the application owner', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [{ user_id: 'someone-else', rescue_id: 'rsc-1' }] });

    await expect(
      listDocuments(deps, makePrincipal({ userId: 'usr-1' }), { applicationId: 'app-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('lets the owning adopter list their documents', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1', rescue_id: 'rsc-1' }] })
      .mockResolvedValueOnce({ rows: [documentRow] });

    const res = await listDocuments(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
    });

    expect(res.documents).toHaveLength(1);
    expect(res.documents[0].documentId).toBe('doc-1');
  });

  it('lets rescue staff of the application rescue list documents', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [{ user_id: 'other', rescue_id: 'rsc-9' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await listDocuments(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      { applicationId: 'app-1' }
    );

    expect(res.documents).toEqual([]);
  });
});

describe('removeDocument', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps } = makeDeps();
    await expect(
      removeDocument(deps, makePrincipal({ permissions: ['applications.read'] }), {
        applicationId: 'app-1',
        documentId: 'doc-1',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      removeDocument(deps, makePrincipal(), { applicationId: '', documentId: 'doc-1' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('soft-deletes the document and returns an empty response', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await removeDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      documentId: 'doc-1',
    });

    const params = query.mock.calls[0][1] as unknown[];
    expect(params).toEqual(['doc-1', 'app-1']);
    expect(res).toEqual({});
  });

  it('throws NOT_FOUND when no live document matches', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rowCount: 0 });

    await expect(
      removeDocument(deps, makePrincipal(), { applicationId: 'app-1', documentId: 'gone' })
    ).rejects.toBeInstanceOf(HandlerError);
  });
});
