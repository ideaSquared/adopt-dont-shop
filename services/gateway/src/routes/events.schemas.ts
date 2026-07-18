// Zod schemas for the event CRUD routes (ADS-938).
// Follows the same pattern as auth.schemas.ts: accept both camelCase and
// snake_case keys via normalize helpers, validate with safeParse, return
// toValidationFailure on failure.

import { z } from 'zod';

export type ValidationFailure = {
  error: string;
  details: { path: string; message: string }[];
};

export const toValidationFailure = (error: z.ZodError): ValidationFailure => ({
  error: 'Invalid request body',
  details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
});

const pickRaw = (body: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null) {
      return body[key];
    }
  }
  return undefined;
};

const EventTypeEnum = z.enum(['adoption', 'fundraising', 'volunteer', 'community']);
const EventStatusEnum = z.enum(['draft', 'published', 'in_progress', 'completed', 'cancelled']);

// ADS-979 / ADS-930: imageUrl (and virtualLink below) previously accepted
// any string up to 2048 chars, including `javascript:`/`data:` schemes.
// imageUrl mirrors assertValidDocumentUrl in
// services/applications/src/grpc/document-handlers.ts — a same-origin
// relative path (the local-storage dev/CI shape), or an https URL on the
// platform's own storage/CDN host. The host allowlist tracks the same env
// vars packages/storage's S3 provider uses to build public URLs.
function allowedImageHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const hosts = new Set<string>();
  const cloudFrontDomain = env.CLOUDFRONT_DOMAIN?.trim();
  if (cloudFrontDomain) {
    hosts.add(cloudFrontDomain);
  }
  const bucket = env.S3_BUCKET_NAME?.trim();
  if (bucket) {
    const region = env.S3_REGION?.trim() || 'us-east-1';
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return hosts;
}

const isSafeImageUrl = (value: string): boolean => {
  if (value === '') {
    return true;
  }
  // `//host/...` is protocol-relative — browsers resolve it off-origin, so
  // it's excluded from the same-origin relative-path allowance below.
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && allowedImageHosts().has(parsed.host);
};

const imageUrlSchema = z
  .string()
  .max(2048)
  .refine(isSafeImageUrl, { message: 'must be a same-origin path or https platform URL' });

// virtualLink holds third-party meeting URLs (Zoom / Meet / Teams), which
// aren't platform storage, so — unlike imageUrl — it isn't restricted to
// the storage host allowlist. It must still be a well-formed https:// URL,
// which rejects javascript:, data:, and protocol-relative //host schemes.
const isSafeVirtualLink = (value: string): boolean => {
  if (value === '') {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:';
};

const virtualLinkSchema = z
  .string()
  .max(2048)
  .refine(isSafeVirtualLink, { message: 'must be an https:// URL' });

const EventLocationSchema = z.object({
  type: z.string().min(1),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(16).optional(),
  virtualLink: virtualLinkSchema.optional(),
  venue: z.string().max(256).optional(),
});

export const CreateEventBodySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(256),
  description: z.string().trim().max(4000).default(''),
  type: EventTypeEnum.optional().default('community'),
  startDate: z.string().trim().min(1, 'startDate is required'),
  endDate: z.string().trim().min(1, 'endDate is required'),
  location: EventLocationSchema.optional(),
  capacity: z.number().int().positive().optional(),
  registrationRequired: z.boolean().default(false),
  featuredPets: z.array(z.string().uuid()).default([]),
  assignedStaff: z.array(z.string().uuid()).default([]),
  isPublic: z.boolean().default(true),
  imageUrl: imageUrlSchema.optional(),
});

export type CreateEventBody = z.infer<typeof CreateEventBodySchema>;

export const normalizeCreateEventBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  name: body.name,
  description: body.description,
  type: body.type,
  startDate: pickRaw(body, ['startDate', 'start_date']),
  endDate: pickRaw(body, ['endDate', 'end_date']),
  location: body.location,
  capacity: body.capacity,
  registrationRequired: pickRaw(body, ['registrationRequired', 'registration_required']),
  featuredPets: pickRaw(body, ['featuredPets', 'featured_pets']),
  assignedStaff: pickRaw(body, ['assignedStaff', 'assigned_staff']),
  isPublic: pickRaw(body, ['isPublic', 'is_public']),
  imageUrl: pickRaw(body, ['imageUrl', 'image_url']),
});

export const UpdateEventBodySchema = z.object({
  name: z.string().trim().min(1).max(256).optional(),
  description: z.string().trim().max(4000).optional(),
  type: EventTypeEnum.optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
  location: EventLocationSchema.optional(),
  capacity: z.number().int().positive().optional(),
  registrationRequired: z.boolean().optional(),
  featuredPets: z.array(z.string().uuid()).optional(),
  assignedStaff: z.array(z.string().uuid()).optional(),
  isPublic: z.boolean().optional(),
  imageUrl: imageUrlSchema.optional(),
  status: EventStatusEnum.optional(),
});

export type UpdateEventBody = z.infer<typeof UpdateEventBodySchema>;

export const normalizeUpdateEventBody = (
  body: Record<string, unknown>
): Record<string, unknown> => ({
  name: body.name,
  description: body.description,
  type: body.type,
  startDate: pickRaw(body, ['startDate', 'start_date']),
  endDate: pickRaw(body, ['endDate', 'end_date']),
  location: body.location,
  capacity: body.capacity,
  registrationRequired: pickRaw(body, ['registrationRequired', 'registration_required']),
  featuredPets: pickRaw(body, ['featuredPets', 'featured_pets']),
  assignedStaff: pickRaw(body, ['assignedStaff', 'assigned_staff']),
  isPublic: pickRaw(body, ['isPublic', 'is_public']),
  imageUrl: pickRaw(body, ['imageUrl', 'image_url']),
  status: body.status,
});

export const AddAttendeeBodySchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  name: z.string().trim().min(1, 'name is required').max(256),
  email: z.string().trim().min(1, 'email is required').max(254).email('email must be valid'),
  notes: z.string().trim().max(1000).optional(),
});

export type AddAttendeeBody = z.infer<typeof AddAttendeeBodySchema>;

export const PatchStatusBodySchema = z.object({
  status: EventStatusEnum,
});

export type PatchStatusBody = z.infer<typeof PatchStatusBodySchema>;
