---
name: commit-conventions
description: >
  Conventional Commits rules used by this repo's commitlint + release-please
  pipeline. Apply when writing any commit message, PR title, or release-relevant
  changelog entry.
---

# Commit & PR Conventions

This repo enforces **Conventional Commits** via `@commitlint/config-conventional`
(see `commitlint.config.js`). The release pipeline (release-please) reads commit
messages to:

1. Decide the next version (major / minor / patch)
2. Generate the changelog automatically
3. Group commits by section

A commit that doesn't follow the convention is rejected by the husky pre-commit
hook, and even if force-pushed, lands in the changelog as "Other" — invisible
to reviewers.

## The format

```
<type>(<optional scope>): <short summary>

<optional longer body, wrapped at ~72 cols>

<optional footer(s) — BREAKING CHANGE, Refs:, Closes:>
```

Examples from the repo's history:

```
feat(audit): system audit row for scheduled report execution
fix(email): reap stuck SENDING rows so crashed-worker sends aren't lost
fix: file-upload size + orphans, CMS publishedAt enforcement
fix: plan-limit TOCTOU on pet create, drop activity_level data loss
docs(claude): add backend-focused skills for endpoints, migrations, tests, audit, errors
```

## Types

| Type | Use for | Triggers release? |
|------|---------|-------------------|
| `feat` | New user-facing feature or capability | minor bump |
| `fix` | Bug fix visible to users or callers | patch bump |
| `docs` | Docs only (READMEs, CLAUDE.md, ADRs, skill files) | no bump |
| `refactor` | Code restructure with no behaviour change | no bump |
| `test` | Test-only changes (new tests, refactored tests) | no bump |
| `chore` | Build, deps, tooling, internal housekeeping | no bump |
| `perf` | Performance improvement | patch bump |
| `style` | Whitespace, formatting (rare — Prettier handles most) | no bump |
| `ci` | CI config (GitHub Actions, etc.) | no bump |
| `build` | Build system / external deps (Webpack, npm scripts) | no bump |
| `revert` | Reverting a previous commit | matches reverted |

**Use `feat` only for things a user can observe.** Internal additions that don't
change behaviour are usually `refactor` or `chore`.

## Scopes

Scope is the area of the codebase affected. Use sparingly and consistently.
Common scopes from this repo:

- App / lib package short names: `audit`, `email`, `pet`, `application`, `auth`,
  `claude`, `chat`, `gdpr`, `field-permissions`, `inbox`
- Cross-cutting: `deps`, `ci`, `docker`

Skip the scope if the change spans many areas (`fix: ...`) — it's better than
inventing a misleading one.

## Subject line rules

- Max ~72 chars (commitlint enforces 100, but aim shorter for changelog readability)
- Imperative mood: "add", "fix", "remove" — NOT "added", "fixes", "removing"
- Lowercase first letter (after the type prefix)
- No trailing full stop
- Describe the WHAT and WHY-in-a-nutshell, not the HOW

```
GOOD: fix(email): reap stuck SENDING rows so crashed-worker sends aren't lost
BAD:  Fix email service (the SENDING rows in the queue were getting stuck).
BAD:  fixed email bug
BAD:  fix: I added a thing that reaps stuck rows in the queue
```

## Body

Use the body when the change deserves explanation. It survives in `git log` and
in the changelog (release-please includes it).

- Wrap around 72 cols
- Explain WHY, not WHAT (the diff shows the what)
- Reference tickets in the footer, not the subject

```
fix(application): prevent duplicate audit rows on bulk approve

Bulk approval was calling AuditLogService.log inside the transaction
AND auditRoute() on the route, producing two rows per record. Switched
to the in-transaction path only to preserve atomicity with the status
write.

Refs: ADS-712
```

## Breaking changes

Two ways to mark a breaking change — pick one:

1. **`!` after type/scope:**
   ```
   feat(api)!: remove /api/v1/legacy-pets endpoint
   ```

2. **`BREAKING CHANGE:` footer:**
   ```
   feat(api): rename pet status enum values

   BREAKING CHANGE: PetStatus.AVAILABLE renamed to PetStatus.ADOPTABLE.
   Frontend callers must update their imports and conditionals.
   ```

Either form triggers a **major** version bump. Use one, not both.

## Footers

Standard footers release-please recognises:

- `Refs: ADS-123` or `Closes: #456` — links to ticket / issue
- `BREAKING CHANGE: <description>` — see above
- `Co-authored-by: Name <email>` — multi-person commit

`Refs:` is preferred for in-flight work; `Closes:` for completing the ticket.

## PR titles

PR titles follow the same convention — they end up as squash-merge commits when
release-please runs, so they ARE the changelog entry. Match the format used by
recent merges on `main`.

## What about WIP / multi-step work?

Within a feature branch you can commit anything you like locally. Before PR /
squash-merge, the squashed commit (or the rebased commits if you're rebasing)
must conform.

If a single PR contains multiple atomic changes worth separate changelog
entries, keep them as separate commits and don't squash. The release pipeline
handles a multi-commit PR fine.

## Common mistakes

- Past-tense subject: `feat: added pet search` → use `feat: add pet search`
- Capitalised subject: `feat: Add pet search` → use `feat: add pet search`
- Trailing period: `feat: add pet search.` → drop the period
- Misusing `feat` for refactors → causes spurious minor bumps in releases
- Unscoped sprawling commits (`feat: lots of stuff`) → split or summarise honestly
- Forgetting `BREAKING CHANGE:` → users get bitten by a silent major-shape change
- Ticket reference in the subject (`feat: ADS-712 add foo`) → put it in the
  footer (`Refs: ADS-712`)
- Skipping the type → commitlint rejects the commit at pre-commit

## Quick reference

```
feat(scope): short imperative summary

[Optional body explaining WHY, wrapped at 72 cols.]

Refs: ADS-XXX
```

That's it. Match the existing log style (`git log --oneline -20`) when in
doubt.
