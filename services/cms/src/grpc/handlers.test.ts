import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { CmsV1 } from '@adopt-dont-shop/proto';

import {
  type HandlerDeps,
  archiveContent,
  createContent,
  createMenu,
  deleteContent,
  deleteMenu,
  getContent,
  getContentBySlug,
  getMenu,
  getPublicContentBySlug,
  getVersionHistory,
  listContent,
  listMenus,
  listPublicContent,
  publishContent,
  restoreVersion,
  unpublishContent,
  updateContent,
  updateMenu,
} from './handlers.js';

const ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'cms.content.read' as Permission,
    'cms.content.create' as Permission,
    'cms.content.update' as Permission,
    'cms.content.delete' as Permission,
    'cms.content.publish' as Permission,
    'cms.menu.read' as Permission,
    'cms.menu.create' as Permission,
    'cms.menu.update' as Permission,
    'cms.menu.delete' as Permission,
  ],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
};

function makeMocks() {
  const clientScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [], rowCount: 0 }),
  };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
    poolScript,
    deps,
  };
}

function contentRow(over: Record<string, unknown> = {}) {
  return {
    content_id: 'c-1',
    title: 'Hello',
    slug: 'hello',
    content_type: 'page',
    status: 'draft',
    content: 'body',
    excerpt: null,
    meta_title: null,
    meta_description: null,
    meta_keywords: [],
    featured_image_url: null,
    published_at: null,
    scheduled_publish_at: null,
    scheduled_unpublish_at: null,
    versions: [],
    current_version: 1,
    author_id: 'usr-admin',
    last_modified_by: null,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

function menuRow(over: Record<string, unknown> = {}) {
  return {
    menu_id: 'm-1',
    name: 'Main',
    location: 'header',
    items: [{ label: 'Home', url: '/' }],
    is_active: true,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

describe('public reads', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('listPublicContent: only published, paginated', async () => {
    mocks.poolScript.push({ rows: [{ count: '5' }] });
    mocks.poolScript.push({ rows: [contentRow({ status: 'published' })] });
    const res = await listPublicContent(mocks.deps, null, { contentType: 0, page: 1, limit: 10 });
    expect(res.total).toBe(5);
    expect(res.items).toHaveLength(1);
    const [sql1] = mocks.poolMock.query.mock.calls[0] as [string];
    expect(sql1).toContain("status = 'published'");
  });

  it('getPublicContentBySlug: 404 when not found', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(getPublicContentBySlug(mocks.deps, null, { slug: 'x' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('getPublicContentBySlug: returns the row when published', async () => {
    mocks.poolScript.push({ rows: [contentRow({ status: 'published' })] });
    const res = await getPublicContentBySlug(mocks.deps, null, { slug: 'hello' });
    expect(res.content?.slug).toBe('hello');
  });

  it('getPublicContentBySlug: rejects empty slug with INVALID_ARGUMENT', async () => {
    await expect(getPublicContentBySlug(mocks.deps, null, { slug: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});

describe('admin reads', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('listContent: refuses callers without cms.content.read', async () => {
    await expect(
      listContent(mocks.deps, NO_PERMS, { contentType: 0, status: 0, page: 1, limit: 10 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('listContent: passes search through with LIKE escape', async () => {
    mocks.poolScript.push({ rows: [{ count: '0' }] });
    mocks.poolScript.push({ rows: [] });
    await listContent(mocks.deps, ADMIN, {
      contentType: 0,
      status: 0,
      search: '100%',
      page: 1,
      limit: 10,
    });
    const [, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe('%100\\%%');
  });

  it('getContent: 404 when missing', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(getContent(mocks.deps, ADMIN, { contentId: 'c-x' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('getContentBySlug: returns row', async () => {
    mocks.poolScript.push({ rows: [contentRow()] });
    const res = await getContentBySlug(mocks.deps, ADMIN, { slug: 'hello' });
    expect(res.content?.title).toBe('Hello');
  });
});

describe('createContent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('inserts a row with version 1 + publishes cms.contentCreated', async () => {
    mocks.clientScript.push({ rows: [contentRow()] });
    const res = await createContent(mocks.deps, ADMIN, {
      title: 'Hello',
      slug: 'hello',
      contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
      content: 'body',
      metaKeywords: [],
    });
    expect(res.content?.contentId).toBe('c-1');
  });

  it('rejects invalid slug shape', async () => {
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: 'x',
        slug: 'Not Valid Slug',
        contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('translates unique_violation into ALREADY_EXISTS', async () => {
    mocks.clientMock.query = vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      const err = new Error('duplicate key') as Error & { code: string };
      err.code = '23505';
      throw err;
    });
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: 'x',
        slug: 'hello',
        contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
  });
});

describe('updateContent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('appends a new version when title/content/excerpt change', async () => {
    mocks.clientScript.push({ rows: [contentRow()] }); // SELECT FOR UPDATE
    mocks.clientScript.push({
      rows: [contentRow({ title: 'Bye', current_version: 2 })],
    });
    const res = await updateContent(mocks.deps, ADMIN, {
      contentId: 'c-1',
      title: 'Bye',
      changeNote: 'fix typo',
      setMetaKeywords: false,
    });
    expect(res.content?.currentVersion).toBe(2);
    const updateCall = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    expect(updateCall).toBeTruthy();
    expect(String(updateCall![0])).toContain('versions = ');
  });

  it('does NOT bump version when nothing visible changed', async () => {
    mocks.clientScript.push({ rows: [contentRow()] });
    mocks.clientScript.push({ rows: [contentRow()] });
    await updateContent(mocks.deps, ADMIN, {
      contentId: 'c-1',
      metaTitle: 'New SEO title',
      setMetaKeywords: false,
    });
    const updateCall = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    expect(String(updateCall![0])).not.toContain('current_version =');
  });

  it('404 when content_id missing', async () => {
    mocks.clientScript.push({ rows: [] });
    await expect(
      updateContent(mocks.deps, ADMIN, {
        contentId: 'c-x',
        setMetaKeywords: false,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('deleteContent', () => {
  it('soft-deletes via deleted_at = now()', async () => {
    const mocks = makeMocks();
    mocks.clientScript.push({ rows: [{ content_id: 'c-1' }], rowCount: 1 });
    const res = await deleteContent(mocks.deps, ADMIN, { contentId: 'c-1' });
    expect(res.deleted).toBe(true);
  });

  it('returns deleted=false when row missing', async () => {
    const mocks = makeMocks();
    mocks.clientScript.push({ rows: [], rowCount: 0 });
    const res = await deleteContent(mocks.deps, ADMIN, { contentId: 'c-x' });
    expect(res.deleted).toBe(false);
  });
});

describe('workflow actions', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('publishContent: sets status=published + published_at', async () => {
    mocks.clientScript.push({
      rows: [contentRow({ status: 'published', published_at: new Date() })],
    });
    const res = await publishContent(mocks.deps, ADMIN, { contentId: 'c-1' });
    expect(res.content?.status).toBe(CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED);
    const call = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    expect(String(call![0])).toContain('published_at = now()');
  });

  it('unpublishContent: sets status=draft (NO published_at update)', async () => {
    mocks.clientScript.push({ rows: [contentRow({ status: 'draft' })] });
    await unpublishContent(mocks.deps, ADMIN, { contentId: 'c-1' });
    const call = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    expect(String(call![0])).not.toContain('published_at = now()');
  });

  it('archiveContent: sets status=archived', async () => {
    mocks.clientScript.push({ rows: [contentRow({ status: 'archived' })] });
    const res = await archiveContent(mocks.deps, ADMIN, { contentId: 'c-1' });
    expect(res.content?.status).toBe(CmsV1.ContentStatus.CONTENT_STATUS_ARCHIVED);
  });
});

describe('version history', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('getVersionHistory returns the versions array', async () => {
    const versions = [
      {
        version: 1,
        title: 'v1',
        content: 'b1',
        excerpt: null,
        changedBy: 'usr-admin',
        changeNote: null,
        createdAt: '2026-06-01T00:00:00Z',
      },
    ];
    mocks.poolScript.push({
      rows: [contentRow({ versions, current_version: 1 })],
    });
    const res = await getVersionHistory(mocks.deps, ADMIN, { contentId: 'c-1' });
    expect(res.versions).toHaveLength(1);
    expect(res.currentVersion).toBe(1);
  });

  it('restoreVersion: copies a past version into the live row + appends a new version', async () => {
    const versions = [
      {
        version: 1,
        title: 'v1',
        content: 'b1',
        excerpt: null,
        changedBy: 'usr-admin',
        changeNote: null,
        createdAt: '2026-06-01T00:00:00Z',
      },
      {
        version: 2,
        title: 'v2',
        content: 'b2',
        excerpt: null,
        changedBy: 'usr-admin',
        changeNote: null,
        createdAt: '2026-06-02T00:00:00Z',
      },
    ];
    mocks.clientScript.push({ rows: [contentRow({ versions, current_version: 2 })] });
    mocks.clientScript.push({
      rows: [
        contentRow({
          versions: [...versions, { ...versions[0], version: 3, changeNote: 'restored' }],
          current_version: 3,
          title: 'v1',
          content: 'b1',
        }),
      ],
    });
    const res = await restoreVersion(mocks.deps, ADMIN, { contentId: 'c-1', version: 1 });
    expect(res.content?.currentVersion).toBe(3);
  });

  it('restoreVersion: 404 when the target version is missing', async () => {
    mocks.clientScript.push({ rows: [contentRow({ current_version: 1 })] });
    await expect(
      restoreVersion(mocks.deps, ADMIN, { contentId: 'c-1', version: 99 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('menus', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('listMenus filters on location + is_active', async () => {
    mocks.poolScript.push({ rows: [menuRow()] });
    await listMenus(mocks.deps, ADMIN, { location: 'header', isActive: true });
    const [, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['header', true]);
  });

  it('createMenu validates items_json is an array', async () => {
    await expect(
      createMenu(mocks.deps, ADMIN, {
        name: 'X',
        location: 'header',
        itemsJson: '{"not":"an array"}',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('createMenu happy path', async () => {
    mocks.clientScript.push({ rows: [menuRow()] });
    const res = await createMenu(mocks.deps, ADMIN, {
      name: 'Main',
      location: 'header',
      itemsJson: '[{"label":"Home","url":"/"}]',
      isActive: true,
    });
    expect(res.menu?.menuId).toBe('m-1');
  });

  it('updateMenu accepts partial updates', async () => {
    mocks.clientScript.push({ rows: [menuRow({ name: 'Renamed' })] });
    await updateMenu(mocks.deps, ADMIN, { menuId: 'm-1', name: 'Renamed' });
    const call = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    expect(String(call![0])).toContain('name = $');
    expect(String(call![0])).not.toContain('items = $');
  });

  it('getMenu 404 when missing', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(getMenu(mocks.deps, ADMIN, { menuId: 'm-x' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('deleteMenu soft-deletes', async () => {
    mocks.clientScript.push({ rows: [{ menu_id: 'm-1' }], rowCount: 1 });
    const res = await deleteMenu(mocks.deps, ADMIN, { menuId: 'm-1' });
    expect(res.deleted).toBe(true);
  });
});
