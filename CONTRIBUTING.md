# Contributing to Adopt Don't Shop

Thanks for contributing! This guide covers everything you need to open a good PR.

## Getting started

Follow the Quick Start in [README.md](./README.md#quick-start) to get the stack running locally.

## Development workflow

### Branch naming

```
<owner>/<ticket>-<short-slug>
# e.g. paragonjenko/ads-123-add-rescue-search
```

### Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add rescue search endpoint
fix: correct date format in profile
refactor: extract validation logic
test: add edge cases for registration
docs: update API reference
```

### TDD loop

This project follows strict Test-Driven Development — **no new behaviour without a test first**:

1. **Red** — write a failing test that describes the desired behaviour
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up while keeping tests green

## Before opening a PR

All four checks must pass locally before pushing:

```bash
npm run lint
npm test
npm run type-check
npm run format:check
```

The CI workflow enforces these — PRs that fail CI will not be merged.

## Code style

Full guidelines are in [.claude/CLAUDE.md](./.claude/CLAUDE.md). Key rules:

- TypeScript strict mode — no `any`, no type assertions without justification
- Schema-first types: define a [Zod](https://zod.dev/) schema, then `z.infer<>` the type
- Immutable data; pure functions; no nested if/else (use early returns)
- Functional components only in React; no class components

## Test requirements

| Package scope | Test runner |
|---|---|
| `lib.*` shared libraries | Jest |
| `app.*` React apps | Vitest + React Testing Library |
| `service.backend` | Vitest |

> Note: ADS-385 will consolidate all packages onto Vitest. Until then, use the runner already configured in the package.

Tests must cover **behaviour**, not implementation. 100% coverage is expected but tests must always be grounded in business requirements, not internal structure.

## Reporting bugs / proposing features

Use the issue templates in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/):

- [Bug report](./.github/ISSUE_TEMPLATE/bug_report.yml)
- [Feature request](./.github/ISSUE_TEMPLATE/feature_request.yml)

## Reviewing & code ownership

Code ownership is defined in [`.github/CODEOWNERS`](./.github/CODEOWNERS). All PRs require at least one approved review before merge.
