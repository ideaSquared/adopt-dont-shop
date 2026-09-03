<!-- Before opening: read CONTRIBUTING.md (../CONTRIBUTING.md). Fill in every section rather than deleting it. -->

## Summary

<!-- What does this PR do? 1-3 bullet points. -->

-

## Changes

<!-- List the key files/areas changed. -->

-

## Before requesting review

<!-- Mirrors the most-failed CI checks — see CONTRIBUTING.md "Before opening a PR". -->

- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, …) — the `commit-lint` CI job fails otherwise
- [ ] Ran `pnpm ci:local:quick` (format + lint + type-check), or the pre-push hook is enabled
- [ ] Ran `pnpm exec turbo run test:coverage --filter=<package-you-changed>` — CI enforces each package's coverage thresholds; plain `pnpm test` does not
- [ ] New behaviour has a test written first (TDD)
- [ ] If a new env var is required, it is in `.env.example`'s REQUIRED banner and documented in `docs/env-reference.md`
- [ ] If touching a `lib.*`, checked its consumer list (`docs/libraries/<lib>-consumers.md`)

## Test plan

<!-- How did you verify this works? -->

- [ ] Tested manually (describe how)
- [ ] Added the `run-e2e` label if this touches user-facing, auth, or cross-app flows

## Screenshots / recordings

<!-- For UI changes, attach a screenshot or recording. Delete if not applicable. -->

## Related

<!-- Link to Linear ticket, related PRs, or issues. -->
