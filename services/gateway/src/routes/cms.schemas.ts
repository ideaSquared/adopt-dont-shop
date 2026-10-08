// Zod schemas for the CMS content create / update routes (ADS-1366).
// Same pattern as events.schemas.ts: the Fastify body schema stays open and
// the handler safeParses with these. They are strict because Fastify's default
// ajv silently strips unknown keys rather than rejecting them, so a JSON-schema
// `additionalProperties: false` could never produce the 400.
//
// Caps mirror the cms service's cms_content columns where it has a limit
// (title / slug / meta_title varchar(500), featured_image_url varchar(2000)).
// content, excerpt and meta_description are unbounded TEXT columns with no
// service-side limit, so those caps are deliberately generous: content sits just
// under the gateway's default 1 MiB body limit (so it is reachable, and no real
// page comes near 1,000,000 characters), excerpt / meta description at 10,000.

import { z } from 'zod';

const TITLE_MAX = 500;
const SLUG_MAX = 500;
const META_TITLE_MAX = 500;
const FEATURED_IMAGE_URL_MAX = 2000;
const CONTENT_MAX = 1_000_000;
const EXCERPT_MAX = 10_000;
const META_DESCRIPTION_MAX = 10_000;
const CHANGE_NOTE_MAX = 1000;

// Issue paths are prefixed to the message by toCmsValidationFailure, so the
// message itself stays field-free ("title: is required").
const requiredText = (max: number) =>
  z.string({ error: 'is required' }).min(1, 'is required').max(max);

const text = (max: number) => z.string().max(max);

const keywords = z.array(z.string());

// The create body keeps the snake_case aliases the route has always honoured
// (content_type, meta_*, featured_image_url) alongside the camelCase keys.
export const CreateContentBodySchema = z
  .strictObject({
    title: requiredText(TITLE_MAX),
    slug: requiredText(SLUG_MAX),
    contentType: z.string().optional(),
    content_type: z.string().optional(),
    content: text(CONTENT_MAX).optional(),
    excerpt: text(EXCERPT_MAX).optional(),
    metaTitle: text(META_TITLE_MAX).optional(),
    meta_title: text(META_TITLE_MAX).optional(),
    metaDescription: text(META_DESCRIPTION_MAX).optional(),
    meta_description: text(META_DESCRIPTION_MAX).optional(),
    metaKeywords: keywords.optional(),
    meta_keywords: keywords.optional(),
    featuredImageUrl: text(FEATURED_IMAGE_URL_MAX).optional(),
    featured_image_url: text(FEATURED_IMAGE_URL_MAX).optional(),
    scheduledPublishAt: z.string().optional(),
    scheduledUnpublishAt: z.string().optional(),
  })
  .refine(body => body.contentType !== undefined || body.content_type !== undefined, {
    message: 'is required',
    path: ['contentType'],
  });

// scheduledPublishAt / scheduledUnpublishAt are accepted but not forwarded:
// the admin editor still sends them on edit, and UpdateContentRequest has no
// scheduling fields, so they have always been dropped. Rejecting them here
// would turn every edit of a scheduled item into a 400.
export const UpdateContentBodySchema = z.strictObject({
  title: text(TITLE_MAX).optional(),
  slug: text(SLUG_MAX).optional(),
  content: text(CONTENT_MAX).optional(),
  excerpt: text(EXCERPT_MAX).optional(),
  metaTitle: text(META_TITLE_MAX).optional(),
  metaDescription: text(META_DESCRIPTION_MAX).optional(),
  metaKeywords: keywords.optional(),
  meta_keywords: keywords.optional(),
  featuredImageUrl: text(FEATURED_IMAGE_URL_MAX).optional(),
  changeNote: text(CHANGE_NOTE_MAX).optional(),
  change_note: text(CHANGE_NOTE_MAX).optional(),
  scheduledPublishAt: z.string().optional(),
  scheduledUnpublishAt: z.string().optional(),
});

// CMS routes answer 400s in the `{ success: false, error }` envelope the admin
// app reads, so flatten the issues into one message instead of using the
// `{ error, details }` shape from the other *.schemas.ts files.
export const toCmsValidationFailure = (error: z.ZodError): { success: false; error: string } => ({
  success: false,
  error: error.issues
    .map(issue =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    )
    .join('; '),
});
