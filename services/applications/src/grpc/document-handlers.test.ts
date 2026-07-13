import { afterEach, describe, expect, it, vi } from 'vitest';

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

// The owner-row lookup every document handler runs first to scope the call
// to the application's adopter / rescue.
function ownerRow(overrides: Partial<{ user_id: string; rescue_id: string }> = {}) {
  return { user_id: overrides.user_id ?? 'usr-1', rescue_id: overrides.rescue_id ?? 'rsc-1' };
}

const documentRow = {
  document_id: 'doc-1',
  application_id: 'app-1',
  type: 'reference',
  filename: 'ref.pdf',
  url: '/uploads/documents/ref.pdf',
  size: 2048,
  mime_type: 'application/pdf',
  created_at: new Date('2026-06-06T10:00:00.000Z'),
};

describe('addDocument', () => {
  it('throws PERMISSION_DENIED without applications.update', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] });
    await expect(
      addDocument(deps, makePrincipal({ permissions: ['applications.read'] }), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: '/uploads/documents/ref.pdf',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: '',
        type: 'reference',
        filename: 'ref.pdf',
        url: '/uploads/documents/ref.pdf',
      })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'missing',
        type: 'reference',
        filename: 'ref.pdf',
        url: '/uploads/documents/ref.pdf',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // Never reaches the INSERT.
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('denies an adopter who is not the application owner', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'someone-else' })] });
    await expect(
      addDocument(deps, makePrincipal({ userId: 'usr-1' }), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: '/uploads/documents/ref.pdf',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('denies rescue staff of a different rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] });
    await expect(
      addDocument(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
        {
          applicationId: 'app-1',
          type: 'reference',
          filename: 'ref.pdf',
          url: '/uploads/documents/ref.pdf',
        }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('inserts the metadata row and returns the mapped Document', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-9' })] })
      .mockResolvedValueOnce({ rows: [documentRow] });

    const res = await addDocument(deps, makePrincipal({ userId: 'usr-9' }), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: '/uploads/documents/ref.pdf',
      size: 2048,
      mimeType: 'application/pdf',
    });

    const params = query.mock.calls[1][1] as unknown[];
    // application_id, type, filename, url, size, mime_type, uploaded_by
    expect(params.slice(1)).toEqual([
      'app-1',
      'reference',
      'ref.pdf',
      '/uploads/documents/ref.pdf',
      2048,
      'application/pdf',
      'usr-9',
    ]);
    expect(res.document).toEqual({
      documentId: 'doc-1',
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: '/uploads/documents/ref.pdf',
      size: 2048,
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-06T10:00:00.000Z',
    });
  });

  it('lets rescue staff of the application rescue add a document', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] })
      .mockResolvedValueOnce({ rows: [documentRow] });

    const res = await addDocument(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: '/uploads/documents/ref.pdf',
      }
    );

    expect(res.document?.documentId).toBe('doc-1');
  });

  it('persists null for omitted size / mime_type', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
      .mockResolvedValueOnce({ rows: [{ ...documentRow, size: null, mime_type: null }] });

    const res = await addDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: '/uploads/documents/ref.pdf',
    });

    const params = query.mock.calls[1][1] as unknown[];
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(res.document?.size).toBeUndefined();
    expect(res.document?.mimeType).toBeUndefined();
  });
});

describe('addDocument — url validation (ADS-930)', () => {
  afterEach(() => {
    delete process.env.CLOUDFRONT_DOMAIN;
    delete process.env.S3_BUCKET_NAME;
    delete process.env.S3_REGION;
  });

  it('rejects a javascript: url without touching the database', async () => {
    const { deps, query } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'javascript:alert(1)',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a data: url', async () => {
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'data:text/html,<script>alert(1)</script>',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a plain http url (not https)', async () => {
    process.env.CLOUDFRONT_DOMAIN = 'cdn.adoptdontshop.com';
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'http://cdn.adoptdontshop.com/apps/aa/ref.pdf',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an attacker-controlled https host', async () => {
    process.env.CLOUDFRONT_DOMAIN = 'cdn.adoptdontshop.com';
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'https://evil.example/x',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a protocol-relative url (off-origin in disguise)', async () => {
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: '//evil.example/x',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects any absolute https url when no storage host is configured', async () => {
    const { deps } = makeDeps();
    await expect(
      addDocument(deps, makePrincipal(), {
        applicationId: 'app-1',
        type: 'reference',
        filename: 'ref.pdf',
        url: 'https://storage.adoptdontshop.com/apps/aa/ref.pdf',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('accepts an https url on the configured CDN host', async () => {
    process.env.CLOUDFRONT_DOMAIN = 'storage.adoptdontshop.com';
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] }).mockResolvedValueOnce({
      rows: [{ ...documentRow, url: 'https://storage.adoptdontshop.com/apps/aa/ref.pdf' }],
    });

    const res = await addDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: 'https://storage.adoptdontshop.com/apps/aa/ref.pdf',
    });

    expect(res.document?.url).toBe('https://storage.adoptdontshop.com/apps/aa/ref.pdf');
  });

  it('accepts an https url on the configured S3 bucket host', async () => {
    process.env.S3_BUCKET_NAME = 'adoptdontshop-uploads';
    process.env.S3_REGION = 'us-east-1';
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] }).mockResolvedValueOnce({
      rows: [
        {
          ...documentRow,
          url: 'https://adoptdontshop-uploads.s3.us-east-1.amazonaws.com/apps/aa/ref.pdf',
        },
      ],
    });

    const res = await addDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: 'https://adoptdontshop-uploads.s3.us-east-1.amazonaws.com/apps/aa/ref.pdf',
    });

    expect(res.document?.url).toBe(
      'https://adoptdontshop-uploads.s3.us-east-1.amazonaws.com/apps/aa/ref.pdf'
    );
  });

  it('accepts a same-origin relative path (local storage default)', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
      .mockResolvedValueOnce({ rows: [documentRow] });

    const res = await addDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      type: 'reference',
      filename: 'ref.pdf',
      url: '/uploads/documents/ref.pdf',
    });

    expect(res.document?.url).toBe('/uploads/documents/ref.pdf');
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
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'someone-else' })] });

    await expect(
      listDocuments(deps, makePrincipal({ userId: 'usr-1' }), { applicationId: 'app-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('lets the owning adopter list their documents', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
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
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] })
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
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] });
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

  it('denies rescue staff of a different rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] });
    await expect(
      removeDocument(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
        { applicationId: 'app-1', documentId: 'doc-1' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('soft-deletes the document and returns an empty response', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await removeDocument(deps, makePrincipal(), {
      applicationId: 'app-1',
      documentId: 'doc-1',
    });

    const params = query.mock.calls[1][1] as unknown[];
    expect(params).toEqual(['doc-1', 'app-1']);
    expect(res).toEqual({});
  });

  it('throws NOT_FOUND when no live document matches', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
      .mockResolvedValueOnce({ rowCount: 0 });

    await expect(
      removeDocument(deps, makePrincipal(), { applicationId: 'app-1', documentId: 'gone' })
    ).rejects.toBeInstanceOf(HandlerError);
  });
});
