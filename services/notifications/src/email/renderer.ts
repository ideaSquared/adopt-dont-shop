// Simple `{{variable}}` template renderer. Matches the monolith's
// behaviour without pulling Handlebars / Mustache as a dependency —
// every transactional template the codebase ships uses plain double-
// brace substitution. Unmatched placeholders are left intact so a typo
// is visible in the rendered email rather than silently becoming an
// empty string.

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

export const renderTemplate = (source: string, variables: Record<string, unknown>): string =>
  source.replace(PLACEHOLDER_RE, (match, name: string) => {
    const value = dig(variables, name);
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
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
  subject: renderTemplate(template.subject, variables),
  htmlContent: renderTemplate(template.htmlContent, variables),
  textContent: template.textContent ? renderTemplate(template.textContent, variables) : null,
});
