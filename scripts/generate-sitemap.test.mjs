import { describe, expect, it, vi } from 'vitest';
import {
  buildSitemapXml,
  fetchAllPetIds,
  fetchAllRescueIds,
  petUrlEntry,
  rescueUrlEntry,
  staticUrlEntries,
  xmlEscape,
} from './generate-sitemap.mjs';

describe('xmlEscape', () => {
  it('escapes the five XML special characters', () => {
    expect(xmlEscape(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });
});

describe('staticUrlEntries', () => {
  it('returns the 5 top-level routes rooted at the given site URL', () => {
    const entries = staticUrlEntries('https://example.test');
    expect(entries).toHaveLength(5);
    expect(entries.map(e => e.loc)).toEqual([
      'https://example.test/',
      'https://example.test/search',
      'https://example.test/discover',
      'https://example.test/blog',
      'https://example.test/help',
    ]);
  });
});

describe('petUrlEntry / rescueUrlEntry', () => {
  it('builds a detail-page URL under the site origin', () => {
    expect(petUrlEntry('https://example.test', 'p1')).toEqual({
      loc: 'https://example.test/pets/p1',
      changefreq: 'weekly',
      priority: '0.7',
    });
    expect(rescueUrlEntry('https://example.test', 'r1')).toEqual({
      loc: 'https://example.test/rescues/r1',
      changefreq: 'weekly',
      priority: '0.6',
    });
  });
});

describe('buildSitemapXml', () => {
  it('wraps entries in a valid urlset with escaped locs', () => {
    const xml = buildSitemapXml([
      { loc: 'https://example.test/a&b', changefreq: 'daily', priority: '1.0' },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.test/a&amp;b</loc>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>1.0</priority>');
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });
});

describe('fetchAllPetIds', () => {
  it('pages through the pets endpoint until hasNext is false', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ pet_id: 'p1' }, { pet_id: 'p2' }],
          pagination: { hasNext: true },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ pet_id: 'p3' }], pagination: { hasNext: false } }),
      });

    const ids = await fetchAllPetIds(fetchImpl, 'http://api.test');

    expect(ids).toEqual(['p1', 'p2', 'p3']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      'http://api.test/api/v1/pets?status=available&page=1&limit=100'
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'http://api.test/api/v1/pets?status=available&page=2&limit=100'
    );
  });

  it('throws on a non-OK response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchAllPetIds(fetchImpl, 'http://api.test')).rejects.toThrow('500');
  });
});

describe('fetchAllRescueIds', () => {
  it('cursors through the rescues endpoint until hasNext is false', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ rescue_id: 'r1' }],
          meta: { hasNext: true, nextCursor: 'cursor-2' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ rescue_id: 'r2' }], meta: { hasNext: false } }),
      });

    const ids = await fetchAllRescueIds(fetchImpl, 'http://api.test');

    expect(ids).toEqual(['r1', 'r2']);
    expect(fetchImpl).toHaveBeenNthCalledWith(1, 'http://api.test/api/v1/rescues?limit=100');
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'http://api.test/api/v1/rescues?limit=100&cursor=cursor-2'
    );
  });
});
