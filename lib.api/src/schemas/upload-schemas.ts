/**
 * ADS-588: schemas for the staged image upload endpoint
 * (`POST /api/v1/uploads/images`). The endpoint returns a public URL +
 * thumbnail URL pair that clients embed in subsequent create/update
 * requests (e.g. the pet-create payload's `images: string[]`).
 */
import { z } from 'zod';

export const ImageUploadResponseSchema = z.object({
  url: z.string().min(1),
  thumbnail_url: z.string().min(1),
  original_filename: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  content_type: z.string().min(1),
});

export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
