// Shared query-string pagination parser (ADS-783). List routes used to
// inline `Number.parseInt(q.page, 10)` / `Number.parseInt(q.limit, 10)`
// and forward the raw result — including NaN and unbounded limits — to
// the gRPC clients. Every list route now goes through parsePagination:
//
//   - missing / empty / zero / negative params → the route's defaults
//     (page 1, limit 20 unless the route overrides them)
//   - non-integer page/limit (e.g. "abc", "2.5") → { ok: false } and the
//     route replies 400 in its own error envelope
//   - limit > MAX_PAGE_LIMIT → { ok: false } (no silent clamp)
//
// Returned as a discriminated result rather than a throw so routes stay
// flat and keep their per-file error envelope ({ error } vs
// { success: false, error }).

export const MAX_PAGE_LIMIT = 100;

export type PaginationDefaults = {
  page?: number;
  limit?: number;
};

export type PaginationResult =
  | { ok: true; page: number; limit: number }
  | { ok: false; error: string };

const INTEGER_PATTERN = /^-?\d+$/;

// undefined → invalid; otherwise the resolved value (defaults applied).
const parseParam = (raw: string | undefined, fallback: number): number | undefined => {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  if (!INTEGER_PATTERN.test(raw.trim())) {
    return undefined;
  }
  const n = Number.parseInt(raw, 10);
  return n <= 0 ? fallback : n;
};

export const parsePagination = (
  query: Record<string, string | undefined>,
  defaults: PaginationDefaults = {}
): PaginationResult => {
  const page = parseParam(query.page, defaults.page ?? 1);
  if (page === undefined) {
    return { ok: false, error: 'page must be a positive integer' };
  }
  const limit = parseParam(query.limit, defaults.limit ?? 20);
  if (limit === undefined) {
    return { ok: false, error: 'limit must be a positive integer' };
  }
  if (limit > MAX_PAGE_LIMIT) {
    return { ok: false, error: `limit must be <= ${MAX_PAGE_LIMIT}` };
  }
  return { ok: true, page, limit };
};

// Canonical pagination envelope. Every list route embeds the same
// `pagination` block so all datatables read one vocabulary regardless of
// whether the backend paginates by offset or keyset:
//
//   { page, limit, hasNext, hasPrev, total?, totalPages?, nextCursor? }
//
// Offset/datatable surfaces carry a real `total` (+ derived `totalPages`)
// so the shared DataTable can render "Page X of Y" and gate Next. Keyset
// feeds carry `nextCursor` and omit the count they can't cheaply produce.
export type PaginationMeta = {
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  total?: number;
  totalPages?: number;
  nextCursor?: string;
};

type OffsetPaginationInput = {
  mode: 'offset';
  page: number;
  limit: number;
  total: number;
};

type KeysetPaginationInput = {
  mode: 'keyset';
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
};

export type PaginationInput = OffsetPaginationInput | KeysetPaginationInput;

export const buildPaginationEnvelope = (input: PaginationInput): PaginationMeta => {
  if (input.mode === 'offset') {
    const { page, limit, total } = input;
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  const { limit, hasNext, nextCursor } = input;
  return {
    page: 1,
    limit,
    hasNext,
    hasPrev: false,
    ...(nextCursor !== undefined ? { nextCursor } : {}),
  };
};
