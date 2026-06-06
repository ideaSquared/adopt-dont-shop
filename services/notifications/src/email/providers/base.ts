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
