import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * ADS-1326: renders a legal document's markdown (see legal-service.ts) to
 * sanitized HTML for display. `marked.parse` is synchronous unless an async
 * extension is registered — none is here — so the `string` branch of its
 * `string | Promise<string>` return type always applies; the cast documents
 * that rather than working around an actual ambiguity.
 */
export const renderLegalMarkdown = (markdown: string): string => {
  const html = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(html);
};
