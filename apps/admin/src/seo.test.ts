import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ADS-1326: app.admin is an internal dashboard, never a public listing —
 * it must never be indexed by a search crawler.
 */
describe('app.admin SEO exclusion', () => {
  it('index.html declares a noindex, nofollow robots meta tag', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(html).toMatch(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']\s*\/>/);
  });

  it('robots.txt disallows all crawling', () => {
    const robotsTxt = readFileSync(resolve(__dirname, '../public/robots.txt'), 'utf8');
    expect(robotsTxt).toMatch(/User-agent:\s*\*/);
    expect(robotsTxt).toMatch(/Disallow:\s*\/\s*$/m);
  });
});
