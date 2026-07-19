import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  anchorExists,
  checkInternalLink,
  checkSameFileAnchor,
  classifyLink,
  daysSince,
  extractHeadings,
  extractLinks,
  formatReport,
  githubSlug,
  isStale,
  listMarkdownFiles,
} from './check-docs-freshness.mjs';

describe('extractLinks', () => {
  it('extracts markdown link targets, ignoring surrounding text', () => {
    const content = 'See [the guide](./guide.md) and ![alt](./img.png "title").';
    expect(extractLinks(content)).toEqual(['./guide.md', './img.png']);
  });

  it('returns an empty array when there are no links', () => {
    expect(extractLinks('Just prose, no links here.')).toEqual([]);
  });
});

describe('classifyLink', () => {
  it('classifies http(s) links as external', () => {
    expect(classifyLink('https://example.com')).toBe('external');
    expect(classifyLink('http://example.com')).toBe('external');
  });

  it('classifies mailto links as skip', () => {
    expect(classifyLink('mailto:someone@example.com')).toBe('skip');
  });

  it('classifies bare anchors as same-file-anchor', () => {
    expect(classifyLink('#section')).toBe('same-file-anchor');
  });

  it('classifies relative paths as internal', () => {
    expect(classifyLink('./other.md')).toBe('internal');
    expect(classifyLink('../README.md#quick-start')).toBe('internal');
  });
});

describe('extractHeadings / githubSlug / anchorExists', () => {
  it('extracts heading text at any level', () => {
    const content = '# Title\n\nSome text\n\n## Sub Heading\n\n### Deep One';
    expect(extractHeadings(content)).toEqual(['Title', 'Sub Heading', 'Deep One']);
  });

  it('slugifies a heading the way GitHub does for simple cases', () => {
    expect(githubSlug('Quick Start')).toBe('quick-start');
    expect(githubSlug('API Endpoints!')).toBe('api-endpoints');
  });

  it('finds an anchor that matches a heading slug', () => {
    const content = '# Doc\n\n## Quick Start\n';
    expect(anchorExists(content, 'quick-start')).toBe(true);
    expect(anchorExists(content, 'missing-section')).toBe(false);
  });
});

describe('checkInternalLink / checkSameFileAnchor', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docs-freshness-'));
    mkdirSync(join(root, 'docs'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('accepts a link to a file that exists', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A');
    writeFileSync(join(root, 'docs', 'b.md'), '# B');
    const result = checkInternalLink(join(root, 'docs', 'a.md'), './b.md');
    expect(result.ok).toBe(true);
  });

  it('flags a link to a file that does not exist', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A');
    const result = checkInternalLink(join(root, 'docs', 'a.md'), './missing.md');
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'missing-file' }));
  });

  it('accepts a link with an anchor that matches a heading in the target file', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A');
    writeFileSync(join(root, 'docs', 'b.md'), '# B\n\n## Section One\n');
    const result = checkInternalLink(join(root, 'docs', 'a.md'), './b.md#section-one');
    expect(result.ok).toBe(true);
  });

  it('flags a link whose anchor does not match any heading in the target file', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A');
    writeFileSync(join(root, 'docs', 'b.md'), '# B\n\n## Section One\n');
    const result = checkInternalLink(join(root, 'docs', 'a.md'), './b.md#nonexistent');
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'missing-anchor' }));
  });

  it('accepts a same-file anchor that matches a heading', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A\n\n## Section One\n');
    const result = checkSameFileAnchor(join(root, 'docs', 'a.md'), '#section-one');
    expect(result.ok).toBe(true);
  });

  it('flags a same-file anchor that does not match any heading', () => {
    writeFileSync(join(root, 'docs', 'a.md'), '# A\n\n## Section One\n');
    const result = checkSameFileAnchor(join(root, 'docs', 'a.md'), '#nope');
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'missing-anchor' }));
  });
});

describe('listMarkdownFiles', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'docs-freshness-list-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('recursively discovers every .md file under a directory', () => {
    mkdirSync(join(root, 'sub'));
    writeFileSync(join(root, 'a.md'), '# A');
    writeFileSync(join(root, 'sub', 'b.md'), '# B');
    writeFileSync(join(root, 'not-markdown.txt'), 'ignore me');

    const found = listMarkdownFiles(root).sort();
    expect(found).toEqual([join(root, 'a.md'), join(root, 'sub', 'b.md')].sort());
  });
});

describe('daysSince / isStale', () => {
  it('computes whole days between a date string and now', () => {
    const now = new Date('2026-07-19T00:00:00Z');
    expect(daysSince('2026-07-09', now)).toBe(10);
  });

  it('flags a doc as stale once it crosses the threshold', () => {
    const now = new Date('2026-07-19T00:00:00Z');
    expect(isStale('2025-07-01', 365, now)).toBe(true);
    expect(isStale('2026-07-01', 365, now)).toBe(false);
  });

  it('never flags a file with no git history as stale', () => {
    expect(isStale(null, 365)).toBe(false);
  });
});

describe('formatReport', () => {
  it('reports "None found" for every section when nothing is broken or stale', () => {
    const report = formatReport({
      brokenLinks: [],
      staleDocs: [],
      externalResults: [],
      staleDays: 365,
    });
    expect(report).toContain('# Docs freshness report');
    expect(report).toMatch(/Broken internal links[\s\S]*None found/);
    expect(report).toMatch(/Stale docs[\s\S]*None found/);
  });

  it('renders broken links and stale docs as tables', () => {
    const report = formatReport({
      brokenLinks: [{ file: 'docs/a.md', target: './missing.md', reason: 'missing-file' }],
      staleDocs: [{ file: 'docs/old.md', lastCommitDate: '2024-01-01', days: 500 }],
      externalResults: [],
      staleDays: 365,
    });
    expect(report).toContain('docs/a.md');
    expect(report).toContain('missing-file');
    expect(report).toContain('docs/old.md');
    expect(report).toContain('500');
  });
});
