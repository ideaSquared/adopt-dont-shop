# ADR 0015 — Solo-maintainer review posture (ADS-1316)

- Status: Accepted
- Date: 2026-09-07
- Scope: `main` branch protection — `.github/rulesets/main-required-checks.json`
- Linear: ADS-1316
- Supersedes / Superseded by: —

## Context

`.github/rulesets/main-required-checks.json` requires zero approving reviews
(`required_approving_review_count: 0`) on `main`. For a single-maintainer
repository this is unavoidable in practice — there is no second person to
review — but it is also a real gap: a PR (including one opened by an AI
coding agent) can merge with no second pair of eyes on a system that holds
applicant ID documents and other personal data (ADS-1301, the production
readiness audit this ticket came from).

The same ruleset also set `strict_required_status_checks_policy: false`,
meaning a PR could merge against a stale base branch — its required checks
had run against an older `main`, not the one it would actually land on.
That half of the finding has a mechanical fix with no tradeoff (branch must
be up to date before merge) and is applied directly in this PR alongside this
ADR, not deferred.

## Decision

**Record the zero-required-reviews posture as a conscious, revisit-triggered
acceptance — not a silent gap — and fix the strict-status-checks half
immediately.**

1. **`strict_required_status_checks_policy: true`.** A PR must be up to date
   with `main` before its required checks are considered satisfied. No
   downside for a low-traffic solo repo: at most it costs a re-run after a
   rebase/merge.
2. **`required_approving_review_count` stays `0`.** There is one committer.
   Requiring a review would either block every PR permanently or force the
   sole maintainer to approve their own change (which GitHub disallows via
   the standard review flow), so the only honest options are "0" or "get a
   second committer." This ADR is the record that "0" is a deliberate choice
   for the current team size, not an oversight — the gap it leaves is real
   and is covered instead by the automated required-checks fan-in
   (`CI Required`, `Verify every lib.* package has tests`,
   `Schema Equivalence`, `Production Image Smoke` — see
   `.github/workflows/README.md#branch-protection`) plus Trivy CVE scanning
   and CodeQL.

## Promotion trigger

**The moment a second committer (human or a second Anthropic/agent account
operating independently) joins the repository, raise
`required_approving_review_count` to at least `1`** and consider
`require_code_owner_review: true` for `services/auth`, `services/rescue`, and
anywhere applicant PII is handled. Until then, this ADR is the documented
acceptance the production readiness check asked for.

## Consequences

- No change to day-to-day workflow today beyond the stale-branch re-run cost
  noted above.
- The next contributor who reads the ruleset JSON and wonders why reviews are
  off has this ADR instead of having to ask.
- A stale-base merge (the strict-status-checks gap) is closed immediately.
