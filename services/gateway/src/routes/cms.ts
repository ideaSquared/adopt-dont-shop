// REST → gRPC translation for /api/v1/cms/*. Backed entirely by
// service.cms. Returns the monolith's `{ success, ... }` envelopes so
// the existing lib.api CMS client deserialises unchanged.

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  CmsV1,
  type CmsContent,
  type CmsCreateContentRequest,
  type CmsListContentRequest,
  type CmsListPublicContentRequest,
  type CmsUpdateContentRequest,
} from '@adopt-dont-shop/proto';

import type { CmsClient } from '../grpc-clients/cms-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { parsePagination } from '../middleware/pagination.js';

export type CmsRoutesOptions = {
  client: CmsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.INTERNAL]: 500,
};

function contentTypeFromString(raw: string | undefined): CmsV1.ContentType {
  if (!raw) {
    return CmsV1.ContentType.CONTENT_TYPE_UNSPECIFIED;
  }
  switch (raw.toLowerCase()) {
    case 'page':
      return CmsV1.ContentType.CONTENT_TYPE_PAGE;
    case 'blog_post':
    case 'blogpost':
      return CmsV1.ContentType.CONTENT_TYPE_BLOG_POST;
    case 'help_article':
    case 'helparticle':
      return CmsV1.ContentType.CONTENT_TYPE_HELP_ARTICLE;
    default:
      return CmsV1.ContentType.CONTENT_TYPE_UNSPECIFIED;
  }
}

function contentStatusFromString(raw: string | undefined): CmsV1.ContentStatus {
  if (!raw) {
    return CmsV1.ContentStatus.CONTENT_STATUS_UNSPECIFIED;
  }
  switch (raw.toLowerCase()) {
    case 'draft':
      return CmsV1.ContentStatus.CONTENT_STATUS_DRAFT;
    case 'published':
      return CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED;
    case 'archived':
      return CmsV1.ContentStatus.CONTENT_STATUS_ARCHIVED;
    case 'scheduled':
      return CmsV1.ContentStatus.CONTENT_STATUS_SCHEDULED;
    default:
      return CmsV1.ContentStatus.CONTENT_STATUS_UNSPECIFIED;
  }
}

function contentTypeToString(t: CmsV1.ContentType): string {
  switch (t) {
    case CmsV1.ContentType.CONTENT_TYPE_PAGE:
      return 'page';
    case CmsV1.ContentType.CONTENT_TYPE_BLOG_POST:
      return 'blog_post';
    case CmsV1.ContentType.CONTENT_TYPE_HELP_ARTICLE:
      return 'help_article';
    default:
      return '';
  }
}

function contentStatusToString(s: CmsV1.ContentStatus): string {
  switch (s) {
    case CmsV1.ContentStatus.CONTENT_STATUS_DRAFT:
      return 'draft';
    case CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED:
      return 'published';
    case CmsV1.ContentStatus.CONTENT_STATUS_ARCHIVED:
      return 'archived';
    case CmsV1.ContentStatus.CONTENT_STATUS_SCHEDULED:
      return 'scheduled';
    default:
      return '';
  }
}

// View shape that matches the monolith's CMS response payload (camelCase
// with the versions array decoded back to a real array).
function contentToView(c: CmsContent): Record<string, unknown> {
  let versions: unknown = [];
  try {
    versions = c.versionsJson ? JSON.parse(c.versionsJson) : [];
  } catch {
    versions = [];
  }
  return {
    contentId: c.contentId,
    title: c.title,
    slug: c.slug,
    contentType: contentTypeToString(c.contentType),
    status: contentStatusToString(c.status),
    content: c.content,
    excerpt: c.excerpt,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    metaKeywords: c.metaKeywords,
    featuredImageUrl: c.featuredImageUrl,
    publishedAt: c.publishedAt,
    scheduledPublishAt: c.scheduledPublishAt,
    scheduledUnpublishAt: c.scheduledUnpublishAt,
    versions,
    currentVersion: c.currentVersion,
    authorId: c.authorId,
    lastModifiedBy: c.lastModifiedBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function menuToView(m: {
  menuId: string;
  name: string;
  location: string;
  itemsJson: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}): Record<string, unknown> {
  let items: unknown = [];
  try {
    items = m.itemsJson ? JSON.parse(m.itemsJson) : [];
  } catch {
    items = [];
  }
  return {
    menuId: m.menuId,
    name: m.name,
    location: m.location,
    items,
    isActive: m.isActive,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export const registerCmsRoutes = async (
  app: FastifyInstance,
  opts: CmsRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // --- Public reads (no auth) ----------------------------------------
  app.get('/api/v1/cms/public/content', async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(q);
    if (!pagination.ok) {
      return reply.code(400).send({ success: false, error: pagination.error });
    }
    const grpcReq: CmsListPublicContentRequest = {
      contentType: contentTypeFromString(q.type),
      page: pagination.page,
      limit: pagination.limit,
    };
    try {
      const res = await client.listPublicContent(grpcReq, buildMetadata(req));
      return reply.send({
        success: true,
        data: res.items.map(contentToView),
        pagination: {
          page: res.page,
          limit: grpcReq.limit || 20,
          total: res.total,
          totalPages: res.totalPages,
        },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { slug: string } }>('/api/v1/cms/public/content/:slug', async (req, reply) => {
    try {
      const res = await client.getPublicContentBySlug(
        { slug: req.params.slug },
        buildMetadata(req)
      );
      if (!res.content) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true, content: contentToView(res.content) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // --- Admin content reads ------------------------------------------
  app.get('/api/v1/cms/content', async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(q);
    if (!pagination.ok) {
      return reply.code(400).send({ success: false, error: pagination.error });
    }
    const grpcReq: CmsListContentRequest = {
      contentType: contentTypeFromString(q.type),
      status: contentStatusFromString(q.status),
      search: q.search,
      page: pagination.page,
      limit: pagination.limit,
    };
    try {
      const res = await client.listContent(grpcReq, buildMetadata(req));
      return reply.send({
        success: true,
        data: res.items.map(contentToView),
        pagination: {
          page: res.page,
          limit: grpcReq.limit || 20,
          total: res.total,
          totalPages: res.totalPages,
        },
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // Slug lookup BEFORE the dynamic :contentId so it isn't shadowed.
  app.get<{ Params: { slug: string } }>('/api/v1/cms/content/slug/:slug', async (req, reply) => {
    try {
      const res = await client.getContentBySlug({ slug: req.params.slug }, buildMetadata(req));
      if (!res.content) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true, content: contentToView(res.content) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { contentId: string } }>(
    '/api/v1/cms/content/:contentId',
    async (req, reply) => {
      try {
        const res = await client.getContent(
          { contentId: req.params.contentId },
          buildMetadata(req)
        );
        if (!res.content) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, content: contentToView(res.content) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post('/api/v1/cms/content', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const grpcReq: CmsCreateContentRequest = {
      title: String(body.title ?? ''),
      slug: String(body.slug ?? ''),
      contentType: contentTypeFromString(String(body.contentType ?? body.content_type ?? '')),
      content: String(body.content ?? ''),
      excerpt: typeof body.excerpt === 'string' ? body.excerpt : undefined,
      metaTitle:
        typeof body.metaTitle === 'string'
          ? body.metaTitle
          : typeof body.meta_title === 'string'
            ? body.meta_title
            : undefined,
      metaDescription:
        typeof body.metaDescription === 'string'
          ? body.metaDescription
          : typeof body.meta_description === 'string'
            ? body.meta_description
            : undefined,
      metaKeywords: Array.isArray(body.metaKeywords)
        ? (body.metaKeywords as string[])
        : Array.isArray(body.meta_keywords)
          ? (body.meta_keywords as string[])
          : [],
      featuredImageUrl:
        typeof body.featuredImageUrl === 'string'
          ? body.featuredImageUrl
          : typeof body.featured_image_url === 'string'
            ? body.featured_image_url
            : undefined,
      scheduledPublishAt:
        typeof body.scheduledPublishAt === 'string' ? body.scheduledPublishAt : undefined,
      scheduledUnpublishAt:
        typeof body.scheduledUnpublishAt === 'string' ? body.scheduledUnpublishAt : undefined,
    };
    try {
      const res = await client.createContent(grpcReq, buildMetadata(req));
      if (!res.content) {
        return reply.code(500).send({ success: false, error: 'no content' });
      }
      return reply.code(201).send({ success: true, content: contentToView(res.content) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.put<{ Params: { contentId: string } }>(
    '/api/v1/cms/content/:contentId',
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const hasMetaKeywords = Array.isArray(body.metaKeywords) || Array.isArray(body.meta_keywords);
      const grpcReq: CmsUpdateContentRequest = {
        contentId: req.params.contentId,
        title: typeof body.title === 'string' ? body.title : undefined,
        slug: typeof body.slug === 'string' ? body.slug : undefined,
        content: typeof body.content === 'string' ? body.content : undefined,
        excerpt: typeof body.excerpt === 'string' ? body.excerpt : undefined,
        metaTitle: typeof body.metaTitle === 'string' ? body.metaTitle : undefined,
        metaDescription:
          typeof body.metaDescription === 'string' ? body.metaDescription : undefined,
        setMetaKeywords: hasMetaKeywords,
        metaKeywords: hasMetaKeywords
          ? ((body.metaKeywords as string[]) ?? (body.meta_keywords as string[]))
          : [],
        featuredImageUrl:
          typeof body.featuredImageUrl === 'string' ? body.featuredImageUrl : undefined,
        changeNote:
          typeof body.changeNote === 'string'
            ? body.changeNote
            : typeof body.change_note === 'string'
              ? body.change_note
              : undefined,
      };
      try {
        const res = await client.updateContent(grpcReq, buildMetadata(req));
        if (!res.content) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, content: contentToView(res.content) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { contentId: string } }>(
    '/api/v1/cms/content/:contentId',
    async (req, reply) => {
      try {
        const res = await client.deleteContent(
          { contentId: req.params.contentId },
          buildMetadata(req)
        );
        if (!res.deleted) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // Workflow
  const workflow = (
    path: string,
    fn: (id: string, m: Metadata) => Promise<{ content?: CmsContent }>
  ): void => {
    app.post<{ Params: { contentId: string } }>(path, async (req, reply) => {
      try {
        const res = await fn(req.params.contentId, buildMetadata(req));
        if (!res.content) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, content: contentToView(res.content) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    });
  };
  workflow('/api/v1/cms/content/:contentId/publish', (id, m) =>
    client.publishContent({ contentId: id }, m)
  );
  workflow('/api/v1/cms/content/:contentId/unpublish', (id, m) =>
    client.unpublishContent({ contentId: id }, m)
  );
  workflow('/api/v1/cms/content/:contentId/archive', (id, m) =>
    client.archiveContent({ contentId: id }, m)
  );

  // Versions
  app.get<{ Params: { contentId: string } }>(
    '/api/v1/cms/content/:contentId/versions',
    async (req, reply) => {
      try {
        const res = await client.getVersionHistory(
          { contentId: req.params.contentId },
          buildMetadata(req)
        );
        return reply.send({
          success: true,
          versions: res.versions,
          currentVersion: res.currentVersion,
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { contentId: string; version: string } }>(
    '/api/v1/cms/content/:contentId/versions/:version/restore',
    async (req, reply) => {
      const version = Number.parseInt(req.params.version, 10);
      if (Number.isNaN(version) || version <= 0) {
        return reply.code(400).send({ success: false, error: 'invalid version' });
      }
      try {
        const res = await client.restoreVersion(
          { contentId: req.params.contentId, version },
          buildMetadata(req)
        );
        if (!res.content) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, content: contentToView(res.content) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // --- Menus --------------------------------------------------------
  app.get('/api/v1/cms/menus', async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const grpcReq = {
      location: q.location,
      isActive: q.active === 'true' ? true : q.active === 'false' ? false : undefined,
    };
    try {
      const res = await client.listMenus(grpcReq, buildMetadata(req));
      return reply.send({ success: true, data: res.menus.map(menuToView) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.get<{ Params: { menuId: string } }>('/api/v1/cms/menus/:menuId', async (req, reply) => {
    try {
      const res = await client.getMenu({ menuId: req.params.menuId }, buildMetadata(req));
      if (!res.menu) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true, menu: menuToView(res.menu) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/v1/cms/menus', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const itemsJson = Array.isArray(body.items)
      ? JSON.stringify(body.items)
      : typeof body.items === 'string'
        ? body.items
        : '[]';
    try {
      const res = await client.createMenu(
        {
          name: String(body.name ?? ''),
          location: String(body.location ?? ''),
          itemsJson,
          isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
        },
        buildMetadata(req)
      );
      if (!res.menu) {
        return reply.code(500).send({ success: false, error: 'no menu' });
      }
      return reply.code(201).send({ success: true, menu: menuToView(res.menu) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.put<{ Params: { menuId: string } }>('/api/v1/cms/menus/:menuId', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const itemsJson = Array.isArray(body.items)
      ? JSON.stringify(body.items)
      : typeof body.items === 'string'
        ? body.items
        : undefined;
    try {
      const res = await client.updateMenu(
        {
          menuId: req.params.menuId,
          name: typeof body.name === 'string' ? body.name : undefined,
          location: typeof body.location === 'string' ? body.location : undefined,
          itemsJson,
          isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
        },
        buildMetadata(req)
      );
      if (!res.menu) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true, menu: menuToView(res.menu) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.delete<{ Params: { menuId: string } }>('/api/v1/cms/menus/:menuId', async (req, reply) => {
    try {
      const res = await client.deleteMenu({ menuId: req.params.menuId }, buildMetadata(req));
      if (!res.deleted) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Helpers --------------------------------------------------------

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
