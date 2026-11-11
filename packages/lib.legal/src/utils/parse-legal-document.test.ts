import { describe, expect, it } from 'vitest';
import { parseLegalDocument } from './parse-legal-document';

const DOCUMENT = `# Privacy Policy

> **Source of truth for the published policy text.** The gateway serves this
> file verbatim. Any change MUST bump the version constant.

**Version:** 2026-09-07-v2
**Last updated:** 7 September 2026

> **Placeholder copy — must be reviewed by legal counsel before launch.**

Intro paragraph that readers should still see.

## 1. Who we are

We are the controller. See our [Terms](./terms.md).

## 2. What we collect

| Data | Retention |
| ---- | --------- |
| Logs | 30 days   |
`;

describe('parseLegalDocument', () => {
  it('extracts the title, version and last-updated date', () => {
    const doc = parseLegalDocument(DOCUMENT);

    expect(doc.title).toBe('Privacy Policy');
    expect(doc.version).toBe('2026-09-07-v2');
    expect(doc.lastUpdated).toBe('7 September 2026');
  });

  it('removes the maintainer notes and metadata lines from the body', () => {
    const { html } = parseLegalDocument(DOCUMENT);

    expect(html).not.toContain('Source of truth');
    expect(html).not.toContain('Placeholder copy');
    expect(html).not.toContain('Version:');
    expect(html).not.toContain('<h1');
  });

  it('keeps ordinary introductory paragraphs', () => {
    const { html } = parseLegalDocument(DOCUMENT);

    expect(html).toContain('Intro paragraph that readers should still see.');
  });

  it('lists each numbered section and anchors its heading', () => {
    const { sections, html } = parseLegalDocument(DOCUMENT);

    expect(sections).toEqual([
      { id: 'section-1-who-we-are', title: '1. Who we are' },
      { id: 'section-2-what-we-collect', title: '2. What we collect' },
    ]);
    expect(html).toContain('<h2 id="section-1-who-we-are">1. Who we are</h2>');
  });

  it('points links to sibling documents at the site routes', () => {
    const { html } = parseLegalDocument(DOCUMENT);

    expect(html).toContain('href="/terms"');
    expect(html).not.toContain('terms.md');
  });

  it('wraps tables in a focusable, named region so they can scroll sideways', () => {
    const { html } = parseLegalDocument(DOCUMENT);

    expect(html).toMatch(/<div data-legal-table="" [^>]*tabindex="0"[^>]*>\s*<table>/);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Scrollable table"');
  });

  it('gives every section a unique anchor even when headings repeat', () => {
    const { sections } = parseLegalDocument(
      '## Overview\n\ntext\n\n## Overview\n\ntext\n\n## Overview 2\n\ntext'
    );

    const ids = sections.map(section => section.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe('section-overview');
  });

  it('sanitizes embedded scripts', () => {
    const { html } = parseLegalDocument('# Terms\n\n## 1. A\n\n<script>alert(1)</script>Safe.');

    expect(html).not.toContain('<script>');
    expect(html).toContain('Safe.');
  });

  it('copes with a document that has no metadata or sections', () => {
    const doc = parseLegalDocument('Just some text.');

    expect(doc.title).toBeNull();
    expect(doc.version).toBeNull();
    expect(doc.lastUpdated).toBeNull();
    expect(doc.sections).toEqual([]);
    expect(doc.html).toContain('Just some text.');
  });
});
