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
  getVersionHistory,
  listContent,
  listMenus,
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

describe('listContent filters', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('appends content_type AND status filters to the WHERE clause', async () => {
    mocks.poolScript.push({ rows: [{ count: '0' }] });
    mocks.poolScript.push({ rows: [] });
    await listContent(mocks.deps, ADMIN, {
      contentType: CmsV1.ContentType.CONTENT_TYPE_BLOG_POST,
      status: CmsV1.ContentStatus.CONTENT_STATUS_DRAFT,
      page: 1,
      limit: 10,
    });
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('content_type = $1');
    expect(sql).toContain('status = $2');
    expect(params).toEqual(['blog_post', 'draft']);
  });

  it('clamps an over-large limit down to 100', async () => {
    mocks.poolScript.push({ rows: [{ count: '0' }] });
    mocks.poolScript.push({ rows: [] });
    await listContent(mocks.deps, ADMIN, {
      contentType: 0,
      status: 0,
      page: 1,
      limit: 5000,
    });
    const [, params] = mocks.poolMock.query.mock.calls[1] as [string, unknown[]];
    expect(params).toEqual([100, 0]);
  });
});

describe('admin read input validation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('getContent rejects an empty content_id', async () => {
    await expect(getContent(mocks.deps, ADMIN, { contentId: '  ' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('getContentBySlug refuses callers without cms.content.read', async () => {
    await expect(getContentBySlug(mocks.deps, NO_PERMS, { slug: 'hello' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('getContentBySlug rejects an empty slug', async () => {
    await expect(getContentBySlug(mocks.deps, ADMIN, { slug: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('getContentBySlug 404 when missing', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(getContentBySlug(mocks.deps, ADMIN, { slug: 'gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('createContent validation + error propagation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects an empty title', async () => {
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: '   ',
        slug: 'hello',
        contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects an unspecified content_type', async () => {
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: 'Hi',
        slug: 'hello',
        contentType: CmsV1.ContentType.CONTENT_TYPE_UNSPECIFIED,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('parses scheduling timestamps and ignores invalid ones (null)', async () => {
    mocks.clientScript.push({ rows: [contentRow()] });
    await createContent(mocks.deps, ADMIN, {
      title: 'Hi',
      slug: 'hello',
      contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
      content: 'b',
      metaKeywords: [],
      scheduledPublishAt: '2026-07-01T00:00:00Z',
      scheduledUnpublishAt: 'not-a-date',
    });
    const insert = mocks.clientMock.query.mock.calls.find(c => /^INSERT/i.test(String(c[0])));
    const params = insert![1] as unknown[];
    // scheduled_publish_at parsed to a Date, scheduled_unpublish_at left null.
    expect(params[9]).toBeInstanceOf(Date);
    expect(params[10]).toBeNull();
  });

  it('throws INTERNAL when the INSERT returns no row', async () => {
    mocks.clientScript.push({ rows: [] });
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: 'Hi',
        slug: 'hello',
        contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('rethrows a non-unique-violation DB error unchanged', async () => {
    mocks.clientMock.query = vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      const err = new Error('connection reset') as Error & { code: string };
      err.code = '08006';
      throw err;
    });
    await expect(
      createContent(mocks.deps, ADMIN, {
        title: 'Hi',
        slug: 'hello',
        contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
        content: '',
        metaKeywords: [],
      })
    ).rejects.toMatchObject({ code: '08006' });
  });
});

describe('updateContent optional field setters', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('refuses callers without cms.content.update', async () => {
    await expect(
      updateContent(mocks.deps, NO_PERMS, { contentId: 'c-1', setMetaKeywords: false })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects an empty content_id', async () => {
    await expect(
      updateContent(mocks.deps, ADMIN, { contentId: '', setMetaKeywords: false })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('sets meta_description, featured_image_url and replaces meta_keywords', async () => {
    mocks.clientScript.push({ rows: [contentRow()] }); // SELECT FOR UPDATE
    mocks.clientScript.push({ rows: [contentRow()] }); // UPDATE
    await updateContent(mocks.deps, ADMIN, {
      contentId: 'c-1',
      metaDescription: 'desc',
      featuredImageUrl: 'https://img/x.png',
      setMetaKeywords: true,
      metaKeywords: ['a', 'b'],
    });
    const update = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    const sql = String(update![0]);
    expect(sql).toContain('meta_description = $');
    expect(sql).toContain('featured_image_url = $');
    expect(sql).toContain('meta_keywords = $');
  });

  it('throws INTERNAL when the UPDATE returns no row', async () => {
    mocks.clientScript.push({ rows: [contentRow()] }); // SELECT FOR UPDATE
    mocks.clientScript.push({ rows: [] }); // UPDATE returns nothing
    await expect(
      updateContent(mocks.deps, ADMIN, { contentId: 'c-1', title: 'Bye', setMetaKeywords: false })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
});

describe('write handler id validation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('deleteContent refuses callers without cms.content.delete', async () => {
    await expect(deleteContent(mocks.deps, NO_PERMS, { contentId: 'c-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('deleteContent rejects an empty content_id', async () => {
    await expect(deleteContent(mocks.deps, ADMIN, { contentId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('publishContent rejects an empty content_id', async () => {
    await expect(publishContent(mocks.deps, ADMIN, { contentId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('unpublishContent rejects an empty content_id', async () => {
    await expect(unpublishContent(mocks.deps, ADMIN, { contentId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('unpublishContent refuses callers without cms.content.publish', async () => {
    await expect(
      unpublishContent(mocks.deps, NO_PERMS, { contentId: 'c-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('archiveContent rejects an empty content_id', async () => {
    await expect(archiveContent(mocks.deps, ADMIN, { contentId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });
});

describe('version history validation', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('getVersionHistory refuses callers without cms.content.read', async () => {
    await expect(
      getVersionHistory(mocks.deps, NO_PERMS, { contentId: 'c-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('getVersionHistory rejects an empty content_id', async () => {
    await expect(getVersionHistory(mocks.deps, ADMIN, { contentId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('restoreVersion refuses callers without cms.content.update', async () => {
    await expect(
      restoreVersion(mocks.deps, NO_PERMS, { contentId: 'c-1', version: 1 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('restoreVersion rejects an empty content_id', async () => {
    await expect(
      restoreVersion(mocks.deps, ADMIN, { contentId: '', version: 1 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('restoreVersion rejects a non-positive version', async () => {
    await expect(
      restoreVersion(mocks.deps, ADMIN, { contentId: 'c-1', version: 0 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('restoreVersion 404 when the content row is missing', async () => {
    mocks.clientScript.push({ rows: [] }); // SELECT FOR UPDATE finds nothing
    await expect(
      restoreVersion(mocks.deps, ADMIN, { contentId: 'c-x', version: 1 })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('menu handlers — validation, filters and write paths', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });

  it('listMenus refuses callers without cms.menu.read', async () => {
    await expect(listMenus(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('listMenus with no filters queries only non-deleted rows', async () => {
    mocks.poolScript.push({ rows: [menuRow()] });
    const res = await listMenus(mocks.deps, ADMIN, {});
    expect(res.menus).toHaveLength(1);
    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual([]);
  });

  it('getMenu refuses callers without cms.menu.read', async () => {
    await expect(getMenu(mocks.deps, NO_PERMS, { menuId: 'm-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('getMenu rejects an empty menu_id', async () => {
    await expect(getMenu(mocks.deps, ADMIN, { menuId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('getMenu returns the row when found', async () => {
    mocks.poolScript.push({ rows: [menuRow()] });
    const res = await getMenu(mocks.deps, ADMIN, { menuId: 'm-1' });
    expect(res.menu?.menuId).toBe('m-1');
  });

  it('createMenu rejects an empty name', async () => {
    await expect(
      createMenu(mocks.deps, ADMIN, { name: '  ', location: 'header', itemsJson: '[]' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('createMenu rejects an empty location', async () => {
    await expect(
      createMenu(mocks.deps, ADMIN, { name: 'Main', location: '', itemsJson: '[]' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('createMenu rejects malformed items_json', async () => {
    await expect(
      createMenu(mocks.deps, ADMIN, { name: 'Main', location: 'header', itemsJson: '{not json' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('createMenu defaults items to [] when items_json is blank', async () => {
    mocks.clientScript.push({ rows: [menuRow()] });
    await createMenu(mocks.deps, ADMIN, { name: 'Main', location: 'header', itemsJson: '' });
    const insert = mocks.clientMock.query.mock.calls.find(c => /^INSERT/i.test(String(c[0])));
    const params = insert![1] as unknown[];
    expect(params[2]).toBe('[]');
    // isActive defaults to true when omitted.
    expect(params[3]).toBe(true);
  });

  it('createMenu throws INTERNAL when the INSERT returns no row', async () => {
    mocks.clientScript.push({ rows: [] });
    await expect(
      createMenu(mocks.deps, ADMIN, { name: 'Main', location: 'header', itemsJson: '[]' })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('updateMenu refuses callers without cms.menu.update', async () => {
    await expect(updateMenu(mocks.deps, NO_PERMS, { menuId: 'm-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('updateMenu rejects an empty menu_id', async () => {
    await expect(updateMenu(mocks.deps, ADMIN, { menuId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('updateMenu sets location, items and is_active together', async () => {
    mocks.clientScript.push({ rows: [menuRow({ location: 'footer', is_active: false })] });
    await updateMenu(mocks.deps, ADMIN, {
      menuId: 'm-1',
      location: 'footer',
      itemsJson: '[{"label":"X","url":"/x"}]',
      isActive: false,
    });
    const update = mocks.clientMock.query.mock.calls.find(c => /^UPDATE/i.test(String(c[0])));
    const sql = String(update![0]);
    expect(sql).toContain('location = $');
    expect(sql).toContain('items = $');
    expect(sql).toContain('is_active = $');
  });

  it('updateMenu with no fields returns the existing row without writing', async () => {
    mocks.poolScript.push({ rows: [menuRow({ name: 'Untouched' })] });
    const res = await updateMenu(mocks.deps, ADMIN, { menuId: 'm-1' });
    expect(res.menu?.name).toBe('Untouched');
    // No transactional UPDATE should have been attempted.
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
  });

  it('updateMenu with no fields 404s when the menu is gone', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(updateMenu(mocks.deps, ADMIN, { menuId: 'gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('updateMenu 404s when the UPDATE matches no row', async () => {
    mocks.clientScript.push({ rows: [] });
    await expect(
      updateMenu(mocks.deps, ADMIN, { menuId: 'gone', name: 'New' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('deleteMenu rejects an empty menu_id', async () => {
    await expect(deleteMenu(mocks.deps, ADMIN, { menuId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('deleteMenu returns deleted=false when the row is missing', async () => {
    mocks.clientScript.push({ rows: [], rowCount: 0 });
    const res = await deleteMenu(mocks.deps, ADMIN, { menuId: 'gone' });
    expect(res.deleted).toBe(false);
  });
});
