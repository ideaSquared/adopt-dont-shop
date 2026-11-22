/**
 * The burn-down list for the axe gate (ADS-1326): axe rules that fail today on
 * one page and are tolerated there, and only there, until fixed.
 *
 * Every other rule, and every rule on every other page, fails the @smoke run.
 * An entry never disables a rule globally: the helper in helpers/axe.ts drops
 * only that rule's violations, only on the named page. When a listed rule stops
 * failing, the test is annotated "a11y-exclusion-unused": delete the entry.
 *
 * Add an entry only for a violation that cannot be fixed in the change that
 * finds it, with a `reason` that says why and what fixing it needs.
 */
export type KnownViolation = {
  /** The page key passed to `expectNoAxeViolations`, e.g. `client /login`. */
  page: string;
  /** The axe rule id, e.g. `label`. */
  rule: string;
  reason: string;
};

export const KNOWN_VIOLATIONS: readonly KnownViolation[] = [];
