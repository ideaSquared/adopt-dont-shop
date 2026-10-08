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
    generateSlug: vi.fn(),
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

  it('GET /slug?title=... returns the generated slug', async () => {
    mocks.generateSlug.mockResolvedValue({ slug: 'hello-world-2' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/slug?title=Hello%20World',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ slug: 'hello-world-2' });
    expect(mocks.generateSlug.mock.calls[0][0]).toEqual({ title: 'Hello World' });
  });

  it('GET /slug without a title is a 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cms/slug',
      headers: ADMIN_HEADERS,
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.generateSlug).not.toHaveBeenCalled();
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

  it('POST /content 400s on a javascript: featuredImageUrl and never calls the service (ADS-1350)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content',
      headers: ADMIN_HEADERS,
      payload: {
        title: 'Hello',
        slug: 'hello',
        contentType: 'page',
        content: 'body',
        featuredImageUrl: 'javascript:alert(1)',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.createContent).not.toHaveBeenCalled();
  });

  it('POST /content 400s on an off-allowlist https featuredImageUrl (ADS-1350)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/cms/content',
      headers: ADMIN_HEADERS,
      payload: {
        title: 'Hello',
        slug: 'hello',
        contentType: 'page',
        content: 'body',
        featuredImageUrl: 'https://evil.example.com/a.jpg',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.createContent).not.toHaveBeenCalled();
  });

  it('POST /content accepts a safe relative featuredImageUrl (ADS-1350)', async () => {
    mocks.createContent.mockResolvedValue({
      content: { ...CONTENT_FIXTURE, featuredImageUrl: '/images/hero.jpg' },
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
        featuredImageUrl: '/images/hero.jpg',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(mocks.createContent.mock.calls[0][0]).toMatchObject({
      featuredImageUrl: '/images/hero.jpg',
    });
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

  it('PUT /content/:contentId 400s on a javascript: featuredImageUrl and never calls the service (ADS-1350)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload: { featuredImageUrl: 'javascript:alert(1)' },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.updateContent).not.toHaveBeenCalled();
  });

  it('PUT /content/:contentId 400s on an off-allowlist https featuredImageUrl (ADS-1350)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload: { featuredImageUrl: 'https://evil.example.com/a.jpg' },
    });
    expect(res.statusCode).toBe(400);
    expect(mocks.updateContent).not.toHaveBeenCalled();
  });

  it('PUT /content/:contentId accepts a safe relative featuredImageUrl (ADS-1350)', async () => {
    mocks.updateContent.mockResolvedValue({
      content: { ...CONTENT_FIXTURE, featuredImageUrl: '/images/hero.jpg' },
    });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload: { featuredImageUrl: '/images/hero.jpg' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.updateContent.mock.calls[0][0]).toMatchObject({
      featuredImageUrl: '/images/hero.jpg',
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

// ADS-1366 — content create/update bodies are closed (unknown keys → 400),
// bounded (maxLength) and require the fields the CMS service itself requires.
// Caps mirror cms_content's varchar columns (title/slug/meta_title 500,
// featured_image_url 2000); TEXT columns have no DB limit, so content sits just
// under the gateway's 1 MiB default body limit and excerpt / meta description /
// change note get generous-but-finite caps.
describe('cms content body validation (ADS-1366)', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeClient>['mocks'];

  beforeEach(async () => {
    app = Fastify({ logger: false });
    const { client, mocks: m } = makeClient();
    mocks = m;
    mocks.createContent.mockResolvedValue({ content: CONTENT_FIXTURE });
    mocks.updateContent.mockResolvedValue({ content: CONTENT_FIXTURE });
    await registerCmsRoutes(app, { client });
  });

  afterEach(async () => {
    await app.close();
  });

  const VALID_CREATE = { title: 'Hello', slug: 'hello', contentType: 'page', content: 'body' };

  // One character over the cap. featuredImageUrl uses a same-origin path so the
  // cap, not the URL safety check (ADS-1350), is what rejects it.
  const overlong = (field: string, max: number): string =>
    field === 'featuredImageUrl' ? `/${'a'.repeat(max)}` : 'a'.repeat(max + 1);

  const create = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/cms/content',
      headers: ADMIN_HEADERS,
      payload,
    });
  const update = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'PUT',
      url: '/api/v1/cms/content/c-1',
      headers: ADMIN_HEADERS,
      payload,
    });

  describe('POST /content', () => {
    it('rejects an unexpected extra field with 400 and never calls the service', async () => {
      const res = await create({ ...VALID_CREATE, isAdmin: true });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        success: false,
        error: expect.stringContaining('isAdmin'),
      });
      expect(mocks.createContent).not.toHaveBeenCalled();
    });

    it('rejects content above the 1,000,000 character cap and accepts content at it', async () => {
      const tooBig = await create({ ...VALID_CREATE, content: 'a'.repeat(1_000_001) });
      expect(tooBig.statusCode).toBe(400);
      expect(tooBig.json()).toMatchObject({
        success: false,
        error: expect.stringContaining('content'),
      });
      expect(mocks.createContent).not.toHaveBeenCalled();

      const atCap = await create({ ...VALID_CREATE, content: 'a'.repeat(1_000_000) });
      expect(atCap.statusCode).toBe(201);
    });

    it.each([
      ['title', 500],
      ['slug', 500],
      ['metaTitle', 500],
      ['featuredImageUrl', 2000],
      ['excerpt', 10_000],
      ['metaDescription', 10_000],
    ])('rejects a %s longer than %i characters', async (field, max) => {
      const res = await create({ ...VALID_CREATE, [field]: overlong(field, max) });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ success: false, error: expect.stringContaining(field) });
      expect(mocks.createContent).not.toHaveBeenCalled();
    });

    it.each(['title', 'slug', 'contentType'])(
      'rejects a body without %s instead of coercing it to an empty string',
      async field => {
        const body: Record<string, unknown> = { ...VALID_CREATE };
        delete body[field];
        const res = await create(body);
        expect(res.statusCode).toBe(400);
        expect(res.json()).toMatchObject({
          success: false,
          error: expect.stringContaining(field),
        });
        expect(mocks.createContent).not.toHaveBeenCalled();
      }
    );

    it('rejects a request with no body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cms/content',
        headers: ADMIN_HEADERS,
      });
      expect(res.statusCode).toBe(400);
      expect(mocks.createContent).not.toHaveBeenCalled();
    });

    it('rejects a field of the wrong type instead of stringifying it', async () => {
      const res = await create({ ...VALID_CREATE, title: { $ne: null } });
      expect(res.statusCode).toBe(400);
      expect(mocks.createContent).not.toHaveBeenCalled();
    });

    it('forwards the exact payload the admin editor sends', async () => {
      const res = await create({
        title: 'Adoption guide',
        slug: 'adoption-guide',
        contentType: 'help_article',
        content: '<p>Hello</p>',
        excerpt: 'Short',
        metaTitle: 'Guide',
        metaDescription: 'A guide',
        metaKeywords: ['adopt', 'guide'],
        featuredImageUrl: '/images/hero.jpg',
        scheduledPublishAt: '2026-12-01T09:00',
        scheduledUnpublishAt: '2026-12-31T09:00',
      });
      expect(res.statusCode).toBe(201);
      expect(mocks.createContent.mock.calls[0][0]).toMatchObject({
        title: 'Adoption guide',
        slug: 'adoption-guide',
        contentType: CmsV1.ContentType.CONTENT_TYPE_HELP_ARTICLE,
        content: '<p>Hello</p>',
        excerpt: 'Short',
        metaTitle: 'Guide',
        metaDescription: 'A guide',
        metaKeywords: ['adopt', 'guide'],
        featuredImageUrl: '/images/hero.jpg',
        scheduledPublishAt: '2026-12-01T09:00',
        scheduledUnpublishAt: '2026-12-31T09:00',
      });
    });

    it('still accepts the snake_case aliases the route has always honoured', async () => {
      const res = await create({
        title: 'Hello',
        slug: 'hello',
        content_type: 'blog_post',
        meta_title: 'T',
        meta_description: 'D',
        meta_keywords: ['k'],
        featured_image_url: '/images/hero.jpg',
      });
      expect(res.statusCode).toBe(201);
      expect(mocks.createContent.mock.calls[0][0]).toMatchObject({
        contentType: CmsV1.ContentType.CONTENT_TYPE_BLOG_POST,
        content: '',
        metaTitle: 'T',
        metaDescription: 'D',
        metaKeywords: ['k'],
        featuredImageUrl: '/images/hero.jpg',
      });
    });
  });

  describe('PUT /content/:contentId', () => {
    it('rejects an unexpected extra field with 400 and never calls the service', async () => {
      const res = await update({ title: 'New title', authorId: 'usr-other' });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({
        success: false,
        error: expect.stringContaining('authorId'),
      });
      expect(mocks.updateContent).not.toHaveBeenCalled();
    });

    it('rejects content above the 1,000,000 character cap and accepts content at it', async () => {
      const tooBig = await update({ content: 'a'.repeat(1_000_001) });
      expect(tooBig.statusCode).toBe(400);
      expect(tooBig.json()).toMatchObject({
        success: false,
        error: expect.stringContaining('content'),
      });
      expect(mocks.updateContent).not.toHaveBeenCalled();

      const atCap = await update({ content: 'a'.repeat(1_000_000) });
      expect(atCap.statusCode).toBe(200);
    });

    it.each([
      ['title', 500],
      ['slug', 500],
      ['metaTitle', 500],
      ['featuredImageUrl', 2000],
      ['excerpt', 10_000],
      ['metaDescription', 10_000],
      ['changeNote', 1000],
    ])('rejects a %s longer than %i characters', async (field, max) => {
      const res = await update({ [field]: overlong(field, max) });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ success: false, error: expect.stringContaining(field) });
      expect(mocks.updateContent).not.toHaveBeenCalled();
    });

    it('accepts the exact payload the admin editor sends and ignores the scheduling fields', async () => {
      const res = await update({
        title: 'Adoption guide',
        content: '<p>Hello</p>',
        excerpt: 'Short',
        metaTitle: 'Guide',
        metaDescription: 'A guide',
        metaKeywords: ['adopt'],
        featuredImageUrl: '/images/hero.jpg',
        scheduledPublishAt: '2026-12-01T09:00',
        scheduledUnpublishAt: '2026-12-31T09:00',
        changeNote: 'Fixed a typo',
      });
      expect(res.statusCode).toBe(200);
      const forwarded = mocks.updateContent.mock.calls[0][0];
      expect(forwarded).toMatchObject({
        contentId: 'c-1',
        title: 'Adoption guide',
        content: '<p>Hello</p>',
        excerpt: 'Short',
        metaTitle: 'Guide',
        metaDescription: 'A guide',
        setMetaKeywords: true,
        metaKeywords: ['adopt'],
        featuredImageUrl: '/images/hero.jpg',
        changeNote: 'Fixed a typo',
      });
      expect(forwarded).not.toHaveProperty('scheduledPublishAt');
      expect(forwarded).not.toHaveProperty('scheduledUnpublishAt');
    });

    it('still accepts the snake_case aliases the route has always honoured', async () => {
      const res = await update({ meta_keywords: ['k'], change_note: 'typo' });
      expect(res.statusCode).toBe(200);
      expect(mocks.updateContent.mock.calls[0][0]).toMatchObject({
        setMetaKeywords: true,
        metaKeywords: ['k'],
        changeNote: 'typo',
      });
    });

    it('treats an empty body as a no-op update rather than an error', async () => {
      const res = await update({});
      expect(res.statusCode).toBe(200);
      expect(mocks.updateContent.mock.calls[0][0]).toMatchObject({
        contentId: 'c-1',
        setMetaKeywords: false,
      });
    });
  });
});
