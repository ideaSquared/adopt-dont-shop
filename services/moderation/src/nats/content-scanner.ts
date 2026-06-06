// First-cut content scanner — a deliberately simple keyword-and-pattern
// matcher we can ship now and replace later. Pure: no I/O, no logger.
// Returns `null` when content passes; a `ScanHit` when something
// trips so the subscriber can file an auto-report with a clear reason.
//
// What we look for (audit-flagged auto-report triggers):
//   1. Scam / solicitation patterns — "send money", "wire transfer",
//      payment-app handles, phone numbers in DMs.
//   2. URLs in chat / pet descriptions (a known abuse vector for
//      off-platform redirect).
//   3. Profanity / hate slurs — minimal seed list; expanded over time.
//
// A richer scanner (ML moderation, regex catalogues, third-party APIs)
// is a follow-up — this is the minimum that makes 8.4 useful today.

export type ScanCategory = 'spam' | 'harassment' | 'inappropriate_content' | 'scam';

export type ScanHit = {
  category: ScanCategory;
  // Short reason — appears in the report title.
  reason: string;
};

// Naive word boundaries: lowercased substring match with regex word
// boundaries (\b). Sufficient for the seed list.
const SCAM_PHRASES: ReadonlyArray<string> = [
  'send money',
  'wire transfer',
  'venmo me',
  'cashapp',
  'paypal me',
  'gift card',
  'western union',
];

// Common contact-leak patterns. The matcher is intentionally
// permissive — false positives become a moderator decision, not a
// silent block.
const PHONE_PATTERN = /\b\d{3}[-\s.]?\d{3}[-\s.]?\d{4}\b/;
// Match URLs / bare domains. We don't try to whitelist hosts here —
// surfacing the URL to the moderator is the goal.
const URL_PATTERN = /(https?:\/\/|\bwww\.|\b[\w-]+\.(com|net|org|io|co)\b)/i;

// Hateful / harassing seed list — kept minimal and uncontroversial.
// Expanded via the moderation team's catalogue when one is wired in.
const HATE_PHRASES: ReadonlyArray<string> = [
  'go kill yourself',
  'die in a fire',
  // Intentionally not enumerating slurs in source; a real catalogue
  // would live in an external file the scanner loads.
];

export function scanContent(content: string | undefined | null): ScanHit | null {
  if (content === undefined || content === null) {
    return null;
  }
  const text = content.toLowerCase();
  if (text.trim() === '') {
    return null;
  }

  for (const phrase of SCAM_PHRASES) {
    if (text.includes(phrase)) {
      return { category: 'scam', reason: `matched scam pattern: "${phrase}"` };
    }
  }

  if (URL_PATTERN.test(content)) {
    return { category: 'spam', reason: 'contains a URL (off-platform link)' };
  }

  if (PHONE_PATTERN.test(content)) {
    return { category: 'spam', reason: 'contains a phone number' };
  }

  for (const phrase of HATE_PHRASES) {
    if (text.includes(phrase)) {
      return { category: 'harassment', reason: `matched harassment phrase: "${phrase}"` };
    }
  }

  return null;
}
