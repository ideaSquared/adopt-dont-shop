// Simple `{{variable}}` template renderer. Matches the monolith's
// behaviour without pulling Handlebars / Mustache as a dependency —
// every transactional template the codebase ships uses plain double-
// brace substitution. Unmatched placeholders are left intact so a typo
// is visible in the rendered email rather than silently becoming an
// empty string.
//
// Context-aware escaping (ADS-842): values interpolated into HTML are
// HTML-escaped so a user-controlled variable can't inject markup/script
// into a recipient's mail client. Two placeholder forms in HTML context:
//   {{var}}   — escaped (the safe default for every variable)
//   {{{var}}} — raw passthrough, for values a producer has ALREADY
//               sanitised (server-built links, pre-sanitised HTML). Each
//               raw site must be justified at the producer.
// Plain-text bodies use the unescaped renderer (no markup to break out
// of, and escaping would corrupt the text). Subjects are HTML-escaped too
// — some mail clients render entities in the subject line, and a subject
// is never intended to carry markup.

import { escapeHtml } from './escape-html.js';

// Triple-brace MUST be tried before double-brace, hence a separate regex
// matched first; the double-brace regex then handles the rest.
const RAW_PLACEHOLDER_RE = /\{\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}\}/g;
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const dig = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
};

// Plain-text / non-HTML renderer: substitute {{var}} with the raw string.
export const renderTemplate = (source: string, variables: Record<string, unknown>): string =>
  source.replace(PLACEHOLDER_RE, (match, name: string) => {
    const value = dig(variables, name);
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });

// HTML-context renderer: {{{var}}} passes through raw (pre-sanitised),
// {{var}} is HTML-escaped. Raw placeholders are resolved first so their
// names aren't also matched by the double-brace pass.
export const renderHtmlTemplate = (source: string, variables: Record<string, unknown>): string =>
  source
    .replace(RAW_PLACEHOLDER_RE, (match, name: string) => {
      const value = dig(variables, name);
      if (value === undefined || value === null) {
        return match;
      }
      return String(value);
    })
    .replace(PLACEHOLDER_RE, (match, name: string) => {
      const value = dig(variables, name);
      if (value === undefined || value === null) {
        return match;
      }
      return escapeHtml(String(value));
    });

export type RenderedTemplate = {
  subject: string;
  htmlContent: string;
  textContent: string | null;
};

export const renderEmailTemplate = (
  template: { subject: string; htmlContent: string; textContent: string | null },
  variables: Record<string, unknown>
): RenderedTemplate => ({
  subject: renderHtmlTemplate(template.subject, variables),
  htmlContent: renderHtmlTemplate(template.htmlContent, variables),
  textContent: template.textContent ? renderTemplate(template.textContent, variables) : null,
});
