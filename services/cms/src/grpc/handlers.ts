// gRPC handlers for CmsService. Plain async functions over
// (deps, principal, req) → Promise<res>; the adapter wraps them in the
// (call, callback) shape and maps HandlerError to grpc.status.
//
// Discipline:
//   - State-changing handlers (Create/Update/Delete/Publish/etc.) run
//     their DB write + NATS event inside @adopt-dont-shop/events
//     withTransaction so events only fire after commit.
//   - Public reads (ListPublicContent, GetPublicContentBySlug) take no
//     principal and only return published rows.
//   - Admin reads/writes gate on the cms.content.* / cms.menu.*
//     permission strings. The seeded admin/super_admin roles have all
//     of these.
//   - Version history lives in the cms_content.versions JSONB column —
//     same shape as the monolith. Update with change_note appends a
//     new entry; Restore copies the snapshot back into the live row
//     fields AND appends a new version with a restore note.

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';

import { isLegalTransition } from './status-machine.js';
import {
  CmsV1,
  type CmsArchiveContentRequest,
  type CmsArchiveContentResponse,
  type CmsContent as CmsContentProto,
  type CmsContentVersion as CmsContentVersionProto,
  type CmsCreateContentRequest,
  type CmsCreateContentResponse,
  type CmsCreateMenuRequest,
  type CmsCreateMenuResponse,
  type CmsDeleteContentRequest,
  type CmsDeleteContentResponse,
  type CmsDeleteMenuRequest,
  type CmsDeleteMenuResponse,
  type CmsGetContentBySlugRequest,
  type CmsGetContentBySlugResponse,
  type CmsGetContentRequest,
  type CmsGetContentResponse,
  type CmsGetMenuRequest,
  type CmsGetMenuResponse,
  type CmsGetPublicContentBySlugRequest,
  type CmsGetPublicContentBySlugResponse,
  type CmsGetVersionHistoryRequest,
  type CmsGetVersionHistoryResponse,
  type CmsListContentRequest,
  type CmsListContentResponse,
  type CmsListMenusRequest,
  type CmsListMenusResponse,
  type CmsListPublicContentRequest,
  type CmsListPublicContentResponse,
  type CmsMenu as CmsMenuProto,
  type CmsPublishContentRequest,
  type CmsPublishContentResponse,
  type CmsRestoreVersionRequest,
  type CmsRestoreVersionResponse,
  type CmsUnpublishContentRequest,
  type CmsUnpublishContentResponse,
  type CmsUpdateContentRequest,
  type CmsUpdateContentResponse,
  type CmsUpdateMenuRequest,
  type CmsUpdateMenuResponse,
} from '@adopt-dont-shop/proto';

// --- Errors ---------------------------------------------------------

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

export type HandlerDeps = WithTransactionDeps;

// --- Permissions -----------------------------------------------------

const CONTENT_READ: Permission = 'cms.content.read' as Permission;
const CONTENT_CREATE: Permission = 'cms.content.create' as Permission;
const CONTENT_UPDATE: Permission = 'cms.content.update' as Permission;
const CONTENT_DELETE: Permission = 'cms.content.delete' as Permission;
const CONTENT_PUBLISH: Permission = 'cms.content.publish' as Permission;
const MENU_READ: Permission = 'cms.menu.read' as Permission;
const MENU_CREATE: Permission = 'cms.menu.create' as Permission;
const MENU_UPDATE: Permission = 'cms.menu.update' as Permission;
const MENU_DELETE: Permission = 'cms.menu.delete' as Permission;

// --- Enum maps -------------------------------------------------------

type ContentTypeDb = 'page' | 'blog_post' | 'help_article';
type ContentStatusDb = 'draft' | 'published' | 'archived' | 'scheduled';

function contentTypeFromProto(t: CmsV1.ContentType): ContentTypeDb | null {
  switch (t) {
    case CmsV1.ContentType.CONTENT_TYPE_PAGE:
      return 'page';
    case CmsV1.ContentType.CONTENT_TYPE_BLOG_POST:
      return 'blog_post';
    case CmsV1.ContentType.CONTENT_TYPE_HELP_ARTICLE:
      return 'help_article';
    default:
      return null;
  }
}
function contentTypeToProto(t: ContentTypeDb): CmsV1.ContentType {
  switch (t) {
    case 'page':
      return CmsV1.ContentType.CONTENT_TYPE_PAGE;
    case 'blog_post':
      return CmsV1.ContentType.CONTENT_TYPE_BLOG_POST;
    case 'help_article':
      return CmsV1.ContentType.CONTENT_TYPE_HELP_ARTICLE;
  }
}
function contentStatusFromProto(s: CmsV1.ContentStatus): ContentStatusDb | null {
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
      return null;
  }
}
function contentStatusToProto(s: ContentStatusDb): CmsV1.ContentStatus {
  switch (s) {
    case 'draft':
      return CmsV1.ContentStatus.CONTENT_STATUS_DRAFT;
    case 'published':
      return CmsV1.ContentStatus.CONTENT_STATUS_PUBLISHED;
    case 'archived':
      return CmsV1.ContentStatus.CONTENT_STATUS_ARCHIVED;
    case 'scheduled':
      return CmsV1.ContentStatus.CONTENT_STATUS_SCHEDULED;
  }
}

// --- Row types -------------------------------------------------------

type ContentRow = {
  content_id: string;
  title: string;
  slug: string;
  content_type: ContentTypeDb;
  status: ContentStatusDb;
  content: string;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[];
  featured_image_url: string | null;
  published_at: Date | null;
  scheduled_publish_at: Date | null;
  scheduled_unpublish_at: Date | null;
  versions: ContentVersionDb[];
  current_version: number;
  author_id: string;
  last_modified_by: string | null;
  created_at: Date;
  updated_at: Date;
};

type ContentVersionDb = {
  version: number;
  title: string;
  content: string;
  excerpt?: string | null;
  changedBy: string;
  changeNote?: string | null;
  createdAt: string;
};

type MenuRow = {
  menu_id: string;
  name: string;
  location: string;
  items: unknown;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const CONTENT_COLUMNS = `content_id, title, slug, content_type, status, content, excerpt,
  meta_title, meta_description, meta_keywords, featured_image_url, published_at,
  scheduled_publish_at, scheduled_unpublish_at, versions, current_version,
  author_id, last_modified_by, created_at, updated_at`;

const MENU_COLUMNS = `menu_id, name, location, items, is_active, created_at, updated_at`;

function rowToContent(row: ContentRow): CmsContentProto {
  return {
    contentId: row.content_id,
    title: row.title,
    slug: row.slug,
    contentType: contentTypeToProto(row.content_type),
    status: contentStatusToProto(row.status),
    content: row.content,
    excerpt: row.excerpt ?? undefined,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    metaKeywords: row.meta_keywords ?? [],
    featuredImageUrl: row.featured_image_url ?? undefined,
    publishedAt: row.published_at?.toISOString(),
    scheduledPublishAt: row.scheduled_publish_at?.toISOString(),
    scheduledUnpublishAt: row.scheduled_unpublish_at?.toISOString(),
    versionsJson: JSON.stringify(row.versions ?? []),
    currentVersion: row.current_version,
    authorId: row.author_id,
    lastModifiedBy: row.last_modified_by ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function rowToMenu(row: MenuRow): CmsMenuProto {
  return {
    menuId: row.menu_id,
    name: row.name,
    location: row.location,
    itemsJson: JSON.stringify(row.items ?? []),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Slug regex matches the monolith — lowercase alphanumerics separated
// by single hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clampLimit(raw: number | undefined): number {
  const n = typeof raw === 'number' && raw > 0 ? raw : 20;
  return Math.min(n, 100);
}

// Parse RFC 3339 → Date, returning null on empty / invalid.
function parseTs(raw: string | undefined): Date | null {
  if (!raw) {
    return null;
  }
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

// --- Public reads ---------------------------------------------------

export async function listPublicContent(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: CmsListPublicContentRequest
): Promise<CmsListPublicContentResponse> {
  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ["status = 'published'", 'deleted_at IS NULL'];
  const params: unknown[] = [];
  if (
    req.contentType !== undefined &&
    req.contentType !== CmsV1.ContentType.CONTENT_TYPE_UNSPECIFIED
  ) {
    const t = contentTypeFromProto(req.contentType);
    if (t !== null) {
      where.push(`content_type = $${params.length + 1}`);
      params.push(t);
    }
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRes = await deps.pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM cms_content ${whereSql}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.count ?? '0', 10);
  const result = await deps.pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS} FROM cms_content ${whereSql}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    items: result.rows.map(rowToContent),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getPublicContentBySlug(
  deps: HandlerDeps,
  _principal: Principal | null,
  req: CmsGetPublicContentBySlugRequest
): Promise<CmsGetPublicContentBySlugResponse> {
  const slug = req.slug?.trim() ?? '';
  if (slug === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'slug is required');
  }
  const result = await deps.pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS} FROM cms_content
       WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `content "${slug}" not found`);
  }
  return { content: rowToContent(row) };
}

// --- Admin content reads --------------------------------------------

export async function listContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsListContentRequest
): Promise<CmsListContentResponse> {
  if (!hasPermission(principal, CONTENT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_READ}' required`);
  }
  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (
    req.contentType !== undefined &&
    req.contentType !== CmsV1.ContentType.CONTENT_TYPE_UNSPECIFIED
  ) {
    const t = contentTypeFromProto(req.contentType);
    if (t !== null) {
      where.push(`content_type = $${params.length + 1}`);
      params.push(t);
    }
  }
  if (req.status !== undefined && req.status !== CmsV1.ContentStatus.CONTENT_STATUS_UNSPECIFIED) {
    const s = contentStatusFromProto(req.status);
    if (s !== null) {
      where.push(`status = $${params.length + 1}`);
      params.push(s);
    }
  }
  if (req.search && req.search.trim() !== '') {
    const escaped = req.search.replace(/[\\%_]/g, c => `\\${c}`);
    const n = params.length + 1;
    where.push(`(title ILIKE $${n} OR slug ILIKE $${n})`);
    params.push(`%${escaped}%`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRes = await deps.pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM cms_content ${whereSql}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.count ?? '0', 10);
  const result = await deps.pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS} FROM cms_content ${whereSql}
       ORDER BY updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    items: result.rows.map(rowToContent),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsGetContentRequest
): Promise<CmsGetContentResponse> {
  if (!hasPermission(principal, CONTENT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_READ}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  const row = await loadContent(deps, id);
  return { content: rowToContent(row) };
}

export async function getContentBySlug(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsGetContentBySlugRequest
): Promise<CmsGetContentBySlugResponse> {
  if (!hasPermission(principal, CONTENT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_READ}' required`);
  }
  const slug = req.slug?.trim() ?? '';
  if (slug === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'slug is required');
  }
  const result = await deps.pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS} FROM cms_content WHERE slug = $1 AND deleted_at IS NULL`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `content "${slug}" not found`);
  }
  return { content: rowToContent(row) };
}

// --- Admin content writes -------------------------------------------

export async function createContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsCreateContentRequest
): Promise<CmsCreateContentResponse> {
  if (!hasPermission(principal, CONTENT_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_CREATE}' required`);
  }
  const title = req.title?.trim() ?? '';
  const slug = req.slug?.trim() ?? '';
  if (title === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'title is required');
  }
  if (!SLUG_RE.test(slug)) {
    throw new HandlerError('INVALID_ARGUMENT', 'slug must be lowercase alphanumerics + hyphens');
  }
  const contentType = contentTypeFromProto(req.contentType);
  if (contentType === null) {
    throw new HandlerError('INVALID_ARGUMENT', 'content_type is required');
  }
  const body = req.content ?? '';

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const initialVersion: ContentVersionDb = {
      version: 1,
      title,
      content: body,
      excerpt: req.excerpt ?? null,
      changedBy: principal.userId,
      changeNote: 'initial draft',
      createdAt: new Date().toISOString(),
    };
    try {
      const result = await client.query<ContentRow>(
        `INSERT INTO cms_content (
           title, slug, content_type, status, content, excerpt, meta_title,
           meta_description, meta_keywords, featured_image_url, scheduled_publish_at,
           scheduled_unpublish_at, versions, current_version, author_id
         ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13)
         RETURNING ${CONTENT_COLUMNS}`,
        [
          title,
          slug,
          contentType,
          body,
          req.excerpt ?? null,
          req.metaTitle ?? null,
          req.metaDescription ?? null,
          req.metaKeywords ?? [],
          req.featuredImageUrl ?? null,
          parseTs(req.scheduledPublishAt),
          parseTs(req.scheduledUnpublishAt),
          JSON.stringify([initialVersion]),
          principal.userId,
        ]
      );
      const inserted = result.rows[0];
      if (!inserted) {
        throw new HandlerError('INTERNAL', 'insert returned no row');
      }
      publish({
        id: `cms.contentCreated.${inserted.content_id}`,
        type: 'cms.contentCreated',
        payload: { contentId: inserted.content_id, slug, contentType, actorId: principal.userId },
      });
      return inserted;
    } catch (err) {
      // Postgres unique_violation on slug.
      if ((err as { code?: string }).code === '23505') {
        throw new HandlerError('ALREADY_EXISTS', `slug "${slug}" is already in use`);
      }
      throw err;
    }
  });
  return { content: rowToContent(row) };
}

export async function updateContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsUpdateContentRequest
): Promise<CmsUpdateContentResponse> {
  if (!hasPermission(principal, CONTENT_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_UPDATE}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const currentResult = await client.query<ContentRow>(
      `SELECT ${CONTENT_COLUMNS} FROM cms_content WHERE content_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      throw new HandlerError('NOT_FOUND', `content ${id} not found`);
    }

    if (req.slug !== undefined && !SLUG_RE.test(req.slug)) {
      throw new HandlerError('INVALID_ARGUMENT', 'slug must be lowercase alphanumerics + hyphens');
    }
    const newTitle = req.title?.trim() || current.title;
    const newContent = req.content ?? current.content;
    const newExcerpt = req.excerpt ?? current.excerpt;

    // Append a new version if title/content/excerpt actually changed.
    const contentChanged =
      newTitle !== current.title ||
      newContent !== current.content ||
      newExcerpt !== current.excerpt;
    let versions = current.versions ?? [];
    let currentVersion = current.current_version;
    if (contentChanged) {
      const nextVersion = currentVersion + 1;
      versions = [
        ...versions,
        {
          version: nextVersion,
          title: newTitle,
          content: newContent,
          excerpt: newExcerpt ?? null,
          changedBy: principal.userId,
          changeNote: req.changeNote ?? null,
          createdAt: new Date().toISOString(),
        },
      ];
      currentVersion = nextVersion;
    }

    const setSql: string[] = [];
    const params: unknown[] = [];
    const pushSet = (col: string, val: unknown): void => {
      params.push(val);
      setSql.push(`${col} = $${params.length}`);
    };

    pushSet('title', newTitle);
    pushSet('content', newContent);
    pushSet('excerpt', newExcerpt);
    if (req.slug !== undefined) {
      pushSet('slug', req.slug);
    }
    if (req.metaTitle !== undefined) {
      pushSet('meta_title', req.metaTitle);
    }
    if (req.metaDescription !== undefined) {
      pushSet('meta_description', req.metaDescription);
    }
    if (req.setMetaKeywords) {
      pushSet('meta_keywords', req.metaKeywords ?? []);
    }
    if (req.featuredImageUrl !== undefined) {
      pushSet('featured_image_url', req.featuredImageUrl);
    }
    if (contentChanged) {
      pushSet('versions', JSON.stringify(versions));
      pushSet('current_version', currentVersion);
    }
    pushSet('last_modified_by', principal.userId);
    pushSet('updated_at', new Date());

    params.push(id);
    let result;
    try {
      result = await client.query<ContentRow>(
        `UPDATE cms_content SET ${setSql.join(', ')} WHERE content_id = $${params.length}
         RETURNING ${CONTENT_COLUMNS}`,
        params
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        throw new HandlerError('ALREADY_EXISTS', 'slug is already in use');
      }
      throw err;
    }
    const updated = result.rows[0];
    if (!updated) {
      throw new HandlerError('INTERNAL', 'update returned no row');
    }
    publish({
      id: `cms.contentUpdated.${updated.content_id}.${Date.now()}`,
      type: 'cms.contentUpdated',
      payload: { contentId: updated.content_id, actorId: principal.userId },
    });
    return updated;
  });
  return { content: rowToContent(row) };
}

export async function deleteContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsDeleteContentRequest
): Promise<CmsDeleteContentResponse> {
  if (!hasPermission(principal, CONTENT_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_DELETE}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }

  const deleted = await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query(
      `UPDATE cms_content SET deleted_at = now() WHERE content_id = $1 AND deleted_at IS NULL
       RETURNING content_id`,
      [id]
    );
    const wasDeleted = result.rowCount !== null && result.rowCount > 0;
    if (wasDeleted) {
      publish({
        id: `cms.contentDeleted.${id}`,
        type: 'cms.contentDeleted',
        payload: { contentId: id, actorId: principal.userId },
      });
    }
    return wasDeleted;
  });
  return { deleted };
}

// --- Workflow -------------------------------------------------------

async function setStatus(
  deps: HandlerDeps,
  principal: Principal,
  contentId: string,
  status: ContentStatusDb,
  topic: string,
  setPublishedAt: boolean
): Promise<ContentRow> {
  return withTransaction(deps, async ({ client, publish }) => {
    // Lock the row and re-validate the transition against the *locked*
    // status so two concurrent transitions can't both pass the gate
    // (no TOCTOU): the second one blocks on FOR UPDATE, then sees the
    // first one's committed status.
    const currentResult = await client.query<ContentRow>(
      `SELECT ${CONTENT_COLUMNS} FROM cms_content
         WHERE content_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [contentId]
    );
    const current = currentResult.rows[0];
    if (!current) {
      throw new HandlerError('NOT_FOUND', `content ${contentId} not found`);
    }
    if (!isLegalTransition(current.status, status)) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `illegal status transition: ${current.status} -> ${status}`
      );
    }

    const setExtra = setPublishedAt ? ', published_at = now()' : '';
    const result = await client.query<ContentRow>(
      `UPDATE cms_content
         SET status = $1, last_modified_by = $2, updated_at = now() ${setExtra}
       WHERE content_id = $3 AND deleted_at IS NULL
       RETURNING ${CONTENT_COLUMNS}`,
      [status, principal.userId, contentId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new HandlerError('NOT_FOUND', `content ${contentId} not found`);
    }
    publish({
      id: `${topic}.${contentId}`,
      type: topic,
      payload: { contentId, actorId: principal.userId },
    });
    return row;
  });
}

export async function publishContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsPublishContentRequest
): Promise<CmsPublishContentResponse> {
  if (!hasPermission(principal, CONTENT_PUBLISH)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_PUBLISH}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  const row = await setStatus(deps, principal, id, 'published', 'cms.contentPublished', true);
  return { content: rowToContent(row) };
}

export async function unpublishContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsUnpublishContentRequest
): Promise<CmsUnpublishContentResponse> {
  if (!hasPermission(principal, CONTENT_PUBLISH)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_PUBLISH}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  const row = await setStatus(deps, principal, id, 'draft', 'cms.contentUnpublished', false);
  return { content: rowToContent(row) };
}

export async function archiveContent(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsArchiveContentRequest
): Promise<CmsArchiveContentResponse> {
  if (!hasPermission(principal, CONTENT_PUBLISH)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_PUBLISH}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  const row = await setStatus(deps, principal, id, 'archived', 'cms.contentArchived', false);
  return { content: rowToContent(row) };
}

// --- Version history -----------------------------------------------

function versionToProto(v: ContentVersionDb): CmsContentVersionProto {
  return {
    version: v.version,
    title: v.title,
    content: v.content,
    excerpt: v.excerpt ?? undefined,
    changedBy: v.changedBy,
    changeNote: v.changeNote ?? undefined,
    createdAt: v.createdAt,
  };
}

export async function getVersionHistory(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsGetVersionHistoryRequest
): Promise<CmsGetVersionHistoryResponse> {
  if (!hasPermission(principal, CONTENT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_READ}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  const row = await loadContent(deps, id);
  return {
    versions: (row.versions ?? []).map(versionToProto),
    currentVersion: row.current_version,
  };
}

export async function restoreVersion(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsRestoreVersionRequest
): Promise<CmsRestoreVersionResponse> {
  if (!hasPermission(principal, CONTENT_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CONTENT_UPDATE}' required`);
  }
  const id = req.contentId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content_id is required');
  }
  if (req.version <= 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'version must be > 0');
  }

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const currentResult = await client.query<ContentRow>(
      `SELECT ${CONTENT_COLUMNS} FROM cms_content WHERE content_id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      throw new HandlerError('NOT_FOUND', `content ${id} not found`);
    }
    const target = (current.versions ?? []).find(v => v.version === req.version);
    if (!target) {
      throw new HandlerError('NOT_FOUND', `version ${req.version} not found`);
    }

    const nextVersion = current.current_version + 1;
    const newVersions = [
      ...(current.versions ?? []),
      {
        version: nextVersion,
        title: target.title,
        content: target.content,
        excerpt: target.excerpt ?? null,
        changedBy: principal.userId,
        changeNote: `restored from version ${req.version}`,
        createdAt: new Date().toISOString(),
      },
    ];

    const result = await client.query<ContentRow>(
      `UPDATE cms_content
         SET title = $1, content = $2, excerpt = $3, versions = $4, current_version = $5,
             last_modified_by = $6, updated_at = now()
       WHERE content_id = $7
       RETURNING ${CONTENT_COLUMNS}`,
      [
        target.title,
        target.content,
        target.excerpt ?? null,
        JSON.stringify(newVersions),
        nextVersion,
        principal.userId,
        id,
      ]
    );
    const restored = result.rows[0];
    if (!restored) {
      throw new HandlerError('INTERNAL', 'update returned no row');
    }
    publish({
      id: `cms.contentRestored.${id}.${Date.now()}`,
      type: 'cms.contentRestored',
      payload: { contentId: id, fromVersion: req.version, actorId: principal.userId },
    });
    return restored;
  });
  return { content: rowToContent(row) };
}

// --- Menus ----------------------------------------------------------

export async function listMenus(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsListMenusRequest
): Promise<CmsListMenusResponse> {
  if (!hasPermission(principal, MENU_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MENU_READ}' required`);
  }
  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  if (req.location !== undefined && req.location !== '') {
    where.push(`location = $${params.length + 1}`);
    params.push(req.location);
  }
  if (req.isActive !== undefined) {
    where.push(`is_active = $${params.length + 1}`);
    params.push(req.isActive);
  }
  const result = await deps.pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM cms_navigation_menus WHERE ${where.join(' AND ')}
       ORDER BY location ASC, name ASC`,
    params
  );
  return { menus: result.rows.map(rowToMenu) };
}

export async function getMenu(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsGetMenuRequest
): Promise<CmsGetMenuResponse> {
  if (!hasPermission(principal, MENU_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MENU_READ}' required`);
  }
  const id = req.menuId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'menu_id is required');
  }
  const result = await deps.pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM cms_navigation_menus WHERE menu_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `menu ${id} not found`);
  }
  return { menu: rowToMenu(row) };
}

export async function createMenu(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsCreateMenuRequest
): Promise<CmsCreateMenuResponse> {
  if (!hasPermission(principal, MENU_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MENU_CREATE}' required`);
  }
  const name = req.name?.trim() ?? '';
  const location = req.location?.trim() ?? '';
  if (name === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  if (location === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'location is required');
  }
  const items = parseItems(req.itemsJson);

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<MenuRow>(
      `INSERT INTO cms_navigation_menus (name, location, items, is_active)
         VALUES ($1, $2, $3, $4)
       RETURNING ${MENU_COLUMNS}`,
      [name, location, JSON.stringify(items), req.isActive ?? true]
    );
    const inserted = result.rows[0];
    if (!inserted) {
      throw new HandlerError('INTERNAL', 'insert returned no row');
    }
    publish({
      id: `cms.menuCreated.${inserted.menu_id}`,
      type: 'cms.menuCreated',
      payload: { menuId: inserted.menu_id, location, actorId: principal.userId },
    });
    return inserted;
  });
  return { menu: rowToMenu(row) };
}

export async function updateMenu(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsUpdateMenuRequest
): Promise<CmsUpdateMenuResponse> {
  if (!hasPermission(principal, MENU_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MENU_UPDATE}' required`);
  }
  const id = req.menuId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'menu_id is required');
  }

  const setSql: string[] = [];
  const params: unknown[] = [];
  const pushSet = (col: string, val: unknown): void => {
    params.push(val);
    setSql.push(`${col} = $${params.length}`);
  };
  if (req.name !== undefined) {
    pushSet('name', req.name);
  }
  if (req.location !== undefined) {
    pushSet('location', req.location);
  }
  if (req.itemsJson !== undefined) {
    const items = parseItems(req.itemsJson);
    pushSet('items', JSON.stringify(items));
  }
  if (req.isActive !== undefined) {
    pushSet('is_active', req.isActive);
  }
  if (setSql.length === 0) {
    // Nothing to change — return the row as-is.
    return { menu: rowToMenu(await loadMenu(deps, id)) };
  }
  pushSet('updated_at', new Date());
  params.push(id);

  const row = await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<MenuRow>(
      `UPDATE cms_navigation_menus SET ${setSql.join(', ')}
         WHERE menu_id = $${params.length} AND deleted_at IS NULL
         RETURNING ${MENU_COLUMNS}`,
      params
    );
    const updated = result.rows[0];
    if (!updated) {
      throw new HandlerError('NOT_FOUND', `menu ${id} not found`);
    }
    publish({
      id: `cms.menuUpdated.${updated.menu_id}.${Date.now()}`,
      type: 'cms.menuUpdated',
      payload: { menuId: updated.menu_id, actorId: principal.userId },
    });
    return updated;
  });
  return { menu: rowToMenu(row) };
}

export async function deleteMenu(
  deps: HandlerDeps,
  principal: Principal,
  req: CmsDeleteMenuRequest
): Promise<CmsDeleteMenuResponse> {
  if (!hasPermission(principal, MENU_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MENU_DELETE}' required`);
  }
  const id = req.menuId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'menu_id is required');
  }
  const deleted = await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query(
      `UPDATE cms_navigation_menus SET deleted_at = now()
         WHERE menu_id = $1 AND deleted_at IS NULL
         RETURNING menu_id`,
      [id]
    );
    const wasDeleted = result.rowCount !== null && result.rowCount > 0;
    if (wasDeleted) {
      publish({
        id: `cms.menuDeleted.${id}`,
        type: 'cms.menuDeleted',
        payload: { menuId: id, actorId: principal.userId },
      });
    }
    return wasDeleted;
  });
  return { deleted };
}

// --- Helpers --------------------------------------------------------

async function loadContent(deps: HandlerDeps, id: string): Promise<ContentRow> {
  const result = await deps.pool.query<ContentRow>(
    `SELECT ${CONTENT_COLUMNS} FROM cms_content WHERE content_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `content ${id} not found`);
  }
  return row;
}

async function loadMenu(deps: HandlerDeps, id: string): Promise<MenuRow> {
  const result = await deps.pool.query<MenuRow>(
    `SELECT ${MENU_COLUMNS} FROM cms_navigation_menus WHERE menu_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `menu ${id} not found`);
  }
  return row;
}

// Parse the items_json string into a real array. Validates that it's
// an array; lets nested shape through unchecked so admin tooling can
// evolve the schema without a server upgrade.
function parseItems(raw: string | undefined): unknown[] {
  if (!raw || raw.trim() === '') {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'items_json must be valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'items_json must be a JSON array');
  }
  return parsed;
}
