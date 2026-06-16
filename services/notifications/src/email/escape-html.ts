// HTML-context escaping for values interpolated into email HTML bodies.
//
// Shared by the template renderer (ADS-842) and the channel adapter's
// inline notification HTML. Escapes the five characters that can break out
// of HTML text / attribute context so a user-controlled value can never
// inject markup or script into a recipient's mail client.

export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
