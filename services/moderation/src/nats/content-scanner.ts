// In-house content scanner — a keyword-and-pattern matcher we own and
// tune (no external moderation provider). Pure: no I/O, no logger.
// Returns `null` when content passes; a `ScanHit` when something
// trips so the subscriber can file an auto-report with a clear reason.
//
// What we look for (audit-flagged auto-report triggers):
//   1. Scam / solicitation patterns — "send money", "wire transfer",
//      payment-app handles, phone numbers in DMs.
//   2. URLs in chat / pet descriptions (a known abuse vector for
//      off-platform redirect).
//   3. Profanity / hate / harassment phrases — minimal seed list,
//      expanded over time via the term catalogue below.
//
// Matching is WORD-BOUNDARY based: a banned term matches as a whole
// word/token (case-insensitive) and tolerates surrounding punctuation,
// so a term embedded in a larger innocent word (e.g. "cashapp" inside
// "cashappraisal") does NOT trip. This replaces the earlier naive
// SUBSTRING matcher.

export type ScanCategory = 'spam' | 'harassment' | 'inappropriate_content' | 'scam';

// Per-hit severity, carried through to the auto-report. Mirrors the DB
// report_severity enum values so the subscriber maps it 1:1.
export type ScanSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ScanHit = {
  category: ScanCategory;
  severity: ScanSeverity;
  // Short reason — appears in the report title.
  reason: string;
};

// A configurable banned-term entry. `term` may be a single word or a
// multi-word phrase; matching is whole-token (each word matched on a
// word boundary, words separated by whitespace). Severity is per-term
// so the catalogue can grade individual entries; absent that, callers
// fall back to the category default.
export type TermEntry = {
  term: string;
  category: ScanCategory;
  severity?: ScanSeverity;
};

// Category-default severities — used when a TermEntry omits `severity`
// and for the regex-driven URL / phone heuristics.
const CATEGORY_SEVERITY: Record<ScanCategory, ScanSeverity> = {
  scam: 'high',
  harassment: 'high',
  inappropriate_content: 'medium',
  spam: 'medium',
};

// The configurable term catalogue. Scam + harassment seed lists; the
// real catalogue grows here (or is loaded into this shape) without
// touching the matcher. Order matters only for tie-breaking — the
// scanner reports the FIRST tripped term in list order.
const TERM_CATALOGUE: ReadonlyArray<TermEntry> = [
  // Scam / solicitation.
  { term: 'send money', category: 'scam' },
  { term: 'wire transfer', category: 'scam' },
  { term: 'venmo me', category: 'scam' },
  { term: 'cashapp', category: 'scam' },
  { term: 'paypal me', category: 'scam' },
  { term: 'gift card', category: 'scam' },
  { term: 'western union', category: 'scam' },
  // Hateful / harassing seed list — kept minimal and uncontroversial.
  // A real catalogue would load slurs from an external file in this
  // same shape rather than enumerate them in source.
  { term: 'go kill yourself', category: 'harassment' },
  { term: 'die in a fire', category: 'harassment' },
];

// Build a case-insensitive whole-token regex for a (possibly
// multi-word) term: each word is bounded by \b, words joined by \s+ so
// arbitrary whitespace between tokens still matches. \b handles
// surrounding punctuation (e.g. "cashapp!", "(cashapp)").
function termToRegex(term: string): RegExp {
  const words = term
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .map(w => `\\b${w}\\b`);
  return new RegExp(words.join('\\s+'), 'i');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Precompile the catalogue once at module load.
const COMPILED_TERMS: ReadonlyArray<{ entry: TermEntry; pattern: RegExp }> = TERM_CATALOGUE.map(
  entry => ({ entry, pattern: termToRegex(entry.term) })
);

// Common contact-leak patterns. The matcher is intentionally
// permissive — false positives become a moderator decision, not a
// silent block.
const PHONE_PATTERN = /\b\d{3}[-\s.]?\d{3}[-\s.]?\d{4}\b/;
// Match URLs / bare domains. We don't try to whitelist hosts here —
// surfacing the URL to the moderator is the goal.
const URL_PATTERN = /(https?:\/\/|\bwww\.|\b[\w-]+\.(com|net|org|io|co)\b)/i;

function severityFor(entry: TermEntry): ScanSeverity {
  return entry.severity ?? CATEGORY_SEVERITY[entry.category];
}

export function scanContent(content: string | undefined | null): ScanHit | null {
  if (content === undefined || content === null) {
    return null;
  }
  if (content.trim() === '') {
    return null;
  }

  // Catalogue terms — whole-token, case-insensitive. Scam entries lead
  // the catalogue, so scam takes precedence over the URL heuristic when
  // both are present (e.g. "venmo me at https://...").
  for (const { entry, pattern } of COMPILED_TERMS) {
    if (pattern.test(content)) {
      return {
        category: entry.category,
        severity: severityFor(entry),
        reason: `matched ${entry.category} term: "${entry.term}"`,
      };
    }
  }

  if (URL_PATTERN.test(content)) {
    return {
      category: 'spam',
      severity: CATEGORY_SEVERITY.spam,
      reason: 'contains a URL (off-platform link)',
    };
  }

  if (PHONE_PATTERN.test(content)) {
    return {
      category: 'spam',
      severity: CATEGORY_SEVERITY.spam,
      reason: 'contains a phone number',
    };
  }

  return null;
}
