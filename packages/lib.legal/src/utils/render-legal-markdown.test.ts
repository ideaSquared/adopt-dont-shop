import { describe, expect, it } from 'vitest';
import { renderLegalMarkdown } from './render-legal-markdown';

describe('renderLegalMarkdown', () => {
  it('converts markdown headings and paragraphs to HTML', () => {
    const html = renderLegalMarkdown('# Terms of Service\n\nBy using this site you agree.');

    expect(html).toContain('<h1>Terms of Service</h1>');
    expect(html).toContain('<p>By using this site you agree.</p>');
  });

  it('sanitizes an embedded script tag', () => {
    const html = renderLegalMarkdown('Safe text.\n\n<script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('Safe text.');
  });
});
