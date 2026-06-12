<!-- Before opening: make sure you've read [CONTRIBUTING.md](../CONTRIBUTING.md) and that all CI checks pass. -->

## Summary

<!-- What does this PR do? 1-3 bullet points. -->

-

## Changes

<!-- List the key files/areas changed. -->

-

## Before requesting review

<!-- Quick PR-readiness signal — see CONTRIBUTING.md for context. -->

- [ ] Ran `pnpm ci:local:quick` locally (or installed the pre-push hook — see CONTRIBUTING.md)
- [ ] Tests for new behaviour added (TDD)
- [ ] If touching `.env` requirements, updated `.env.example`'s REQUIRED block
- [ ] If touching a `lib.*`, considered consumer impact across `app.*` and `service.backend`

## Test plan

<!-- How did you verify this works? Check off items as you go. -->

- [ ] Existing tests pass (`pnpm test`)
- [ ] New behaviour is covered by tests
- [ ] Tested manually (describe how)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)

## Screenshots / recordings

<!-- For UI changes, attach a screenshot or recording. Delete if not applicable. -->

## Related

<!-- Link to Linear ticket, related PRs, or issues. -->
