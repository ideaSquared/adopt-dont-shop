// Shared helpers for email providers. Stripping CR/LF on every header
// field before composing the From/To strings is the one piece of
// defense-in-depth all providers share — the SDKs reject CRLF too, but
// catching it at the boundary keeps the protection independent of which
// provider is wired up.

import type { QueuedEmail } from '../types.js';

export const stripCrlf = (s: string): string => s.replace(/[\r\n]+/g, ' ').trim();

export const generateMessageId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export type SanitizedEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// Mask a recipient for Layer-1 logs (ADS-1257): a recipient email address is
// PII, so keep only the first local-part character and the domain — enough to
// correlate a log line, never the full address. Accepts "Name <local@domain>"
// or a bare "local@domain".
export const maskRecipient = (recipient: string): string => {
  const angle = recipient.match(/<([^>]*)>/);
  const addr = (angle ? angle[1] : recipient).trim();
  const at = addr.lastIndexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `${addr.slice(0, 1)}***@${addr.slice(at + 1)}`;
};

export const maskRecipients = (list: readonly string[]): string[] => list.map(maskRecipient);

export const sanitizeEmail = (email: QueuedEmail): SanitizedEmail => {
  const fromName = stripCrlf(email.fromName ?? "Adopt Don't Shop");
  const fromEmail = stripCrlf(email.fromEmail);
  const toName = email.toName ? stripCrlf(email.toName) : '';
  const toEmail = stripCrlf(email.toEmail);

  return {
    from: `${fromName} <${fromEmail}>`,
    to: toName ? `${toName} <${toEmail}>` : toEmail,
    subject: stripCrlf(email.subject),
    html: email.htmlContent,
    text: email.textContent ?? undefined,
  };
};
