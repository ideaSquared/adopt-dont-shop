import { z } from 'zod';

/**
 * Shared response shape for admin bulk endpoints (users, rescues, pets,
 * applications, reports).
 *
 * Backwards-compatible additive extension: the existing aggregate fields
 * (`success`/`failed` counts, or domain-specific equivalents) remain in
 * each endpoint's response. `failedIds` is always present (may be empty)
 * so consumers can offer "retry failed only" UX without re-fetching to
 * diff against the input. `results` is optional per-item detail for
 * richer error reporting where the service can cheaply produce it.
 *
 * Per-endpoint response schemas should `.merge()` this with their own
 * aggregate-count fields.
 */
export const BulkPerItemResultSchema = z.object({
  id: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});
export type BulkPerItemResult = z.infer<typeof BulkPerItemResultSchema>;

export const BulkOperationFailedIdsSchema = z.object({
  failedIds: z.array(z.string()),
  results: z.array(BulkPerItemResultSchema).optional(),
});
export type BulkOperationFailedIds = z.infer<typeof BulkOperationFailedIdsSchema>;
