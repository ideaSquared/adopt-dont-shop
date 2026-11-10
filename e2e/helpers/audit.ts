import type { Locator, Page } from '@playwright/test';

/**
 * Rows of the admin audit log table about one user. The Audit page names the
 * audited user and links to `/users/<id>` instead of printing the raw id, so
 * match the row by that link.
 */
export const auditRowsForUser = (page: Page, userId: string): Locator =>
  page.getByRole('row').filter({ has: page.locator(`a[href$="/users/${userId}"]`) });
