import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CmsV1 } from '@adopt-dont-shop/proto';

import type { CmsClient } from '../grpc-clients/cms-client.js';

import { registerCmsRoutes } from './cms.js';

function makeClient(): {
  client: CmsClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks = {
    listPublicContent: vi.fn(),
    getPublicContentBySlug: vi.fn(),
    listContent: vi.fn(),
    getContent: vi.fn(),
    getContentBySlug: vi.fn(),
    createContent: vi.fn(),
    updateContent: vi.fn(),
    deleteContent: vi.fn(),
    publishContent: vi.fn(),
    unpublishContent: vi.fn(),
    archiveContent: vi.fn(),
    getVersionHistory: vi.fn(),
    restoreVersion: vi.fn(),
    listMenus: vi.fn(),
    getMenu: vi.fn(),
    createMenu: vi.fn(),
    updateMenu: vi.fn(),
    deleteMenu: vi.fn(),
  };
  return { client: mocks as unknown as CmsClient, mocks };
}

const ADMIN_HEADERS = {
  'x-user-id': 'usr-admin',
  'x-user-roles': 'admin',
  'x-user-permissions': 'cms.content.read,cms.content.create',
};

const CONTENT_FIXTURE = {
  contentId: 'c-1',
  title: 'Hello',
  slug: 'hello',
  contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
  status: CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED,
  content: 'body',
  metaKeywords: [],
  versionsJson: '[]',
  currentVersion: 1,
  authorId: 'usr-admin',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const MENU_FIXTURE = {
  menuId: 'm-1',
  name: 'Main',
  location: 'header',
  itemsJson: '[{"label":"Home"}]',
  isActive: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('cms gateway routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, mocks: m } = makeClient();
    mocks = m;
    await registerCmsRoutes(app, { client });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /public/content returns the monolith pagination envelope', async () => {
    mocks.listPublicContent.mockResolvedValue({
      items: [CONTENT_FIXTURE],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    const res = await app.inject({ method: 'GET', url: '/api/v1/cms/public/content?limit=5' });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { success: boolean; data: unknown[]; pagination: { total: number } };
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('GET /public/content rejects a non-numeric page with 400 before calling the service', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/cms/public/content?page=abc' });
    expect(res.statusCode).toBe(400);
    const json = res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(mocks.listPublicContent).not.toHaveBeenCalled();
  });

  it('GET /public/content rejects limit > 100 with 400 instead of clamping', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/cms/public/content?limit=101' });
    expect(res.statusCode).toBe(400);
    expect(mocks.listPublicContent).not.toHaveBeenCalled();
  });

  it('GET /public/content/:slug returns the content view', async () => {
    mocks.getPublicContentBySlug.mockResolvedValue({ content: CONTENT_FIXTURE });
    const res = await app.inject({ method: 'GET', url: '/api/v1/cms/public/content/hello' });
    expect(res.statusCode).toBe(200);
    const json = res.json() as { content: { slug: string } };
    expect(json.content.slug).toBe('hello');
  });

  it('GET /public/content/:slug maps gRPC NOT_FOUND → 404', async () => {
    mocks.getPublicContentBySlug.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'nf' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/cms/public/content/nope' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /content?type=page&status=published passes filters', async () => {
    mocks.listContent.mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 1 });
    await app.inject({
      method: 'GET',
      url: '/api/v1/cms/content?type=page&status=published',
      headers: ADMIN_HEADERS,
    });
    expect(mocks.listContent.mock.calls[0][0]).toMatchObject({
      contentType: CmsV1.ContentType.CONTENT_TYPE_PAGE,
      status: CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED,
    });
  });

  it('GET /content/slug/:slug is matched before /:contentId', async () => {
    mocks.getContentBySlug.mockResolvedValue({ content: CONTENT_FIXTURE });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/content/slug/hello',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.getContentBySlug).toHaveBeenCalled();
    expect(mocks.getContent).not.toHaveBeenCalled();
  });

  it('POST /content returns 201 + decoded versions array', async () => {
    mocks.createContent.mockResolvedValue({
      content: { ...CONTENT_FIXTURE, versionsJson: '[{"version":1}]' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content',
      headers: ADMIN_HEADERS,
      payload: {
        title: 'Hello',
        slug: 'hello',
        contentType: 'page',
        content: 'body',
      },
    });
    expect(res.statusCode).toBe(201);
    const json = res.json() as { content: { versions: unknown[] } };
    expect(json.content.versions).toEqual([{ version: 1 }]);
  });

  it('POST /content maps gRPC ALREADY_EXISTS → 409', async () => {
    mocks.createContent.mockRejectedValue({
      code: grpcStatus.ALREADY_EXISTS,
      details: 'dupe slug',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content',
      headers: ADMIN_HEADERS,
      payload: { title: 'x', slug: 'hello', contentType: 'page', content: '' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('PUT /content/:contentId sets setMetaKeywords only when keywords were sent', async () => {
    mocks.updateContent.mockResolvedValue({ content: CONTENT_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload: { title: 'New title' },
    });
    expect(mocks.updateContent.mock.calls[0][0].setMetaKeywords).toBe(false);

    mocks.updateContent.mockClear();
    mocks.updateContent.mockResolvedValue({ content: CONTENT_FIXTURE });
    await app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload: { metaKeywords: ['adopt', 'rescue'] },
    });
    expect(mocks.updateContent.mock.calls[0][0]).toMatchObject({
      setMetaKeywords: true,
      metaKeywords: ['adopt', 'rescue'],
    });
  });

  it('POST /content/:id/publish routes to publishContent', async () => {
    mocks.publishContent.mockResolvedValue({ content: CONTENT_FIXTURE });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content/c-1/publish',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.publishContent).toHaveBeenCalled();
  });

  it('POST /content/:id/versions/:version/restore validates the version param', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content/c-1/versions/abc/restore',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.restoreVersion).not.toHaveBeenCalled();
  });

  it('GET /menus passes location + active filters', async () => {
    mocks.listMenus.mockResolvedValue({ menus: [MENU_FIXTURE] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/cms/menus?location=header&active=true',
      headers: ADMIN_HEADERS,
    });
    expect(mocks.listMenus.mock.calls[0][0]).toEqual({ location: 'header', isActive: true });
  });

  it('POST /menus accepts items as JS array OR string', async () => {
    mocks.createMenu.mockResolvedValue({ menu: MENU_FIXTURE });
    await app.inject({
      method: 'POST',
      url: '/api/v1/cms/menus',
      headers: ADMIN_HEADERS,
      payload: { name: 'X', location: 'header', items: [{ label: 'A' }] },
    });
    expect(mocks.createMenu.mock.calls[0][0].itemsJson).toBe('[{"label":"A"}]');
  });

  it('DELETE /menus/:id returns 404 when not deleted', async () => {
    mocks.deleteMenu.mockResolvedValue({ deleted: false });
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/cms/menus/m-x',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(404);
  });
});
