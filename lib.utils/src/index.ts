// Main exports for @adopt-dont-shop/lib.utils
export { UtilsService } from './services/utils-service';
export type { UtilsServiceConfig, UtilsServiceOptions } from './types';
export * from './types';

// Environment configuration utilities
export * from './env';

// UK Locale utilities (dates, currency, phone, address formatting)
export * from './locale';

// XSS-hardened href/src sanitizer
export { safeHref } from './safe-href';

// SQL LIKE/iLike wildcard escaper for user-supplied search terms
export { escapeLikePattern } from './escape-like';

// Null-safe date formatter
export { safeFormatDate } from './safe-format-date';
