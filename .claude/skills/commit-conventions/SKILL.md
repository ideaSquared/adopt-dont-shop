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
<type>(<optional scope>): <short summary> (ADS-NNN)

<optional longer body, wrapped at ~72 cols>

<optional footer(s) — BREAKING CHANGE, Co-authored-by>
```

The Linear ticket goes in the **subject**, in parentheses at the end — this is
the repo's actual practice (see `git log`), not in a footer.

Examples from recent `main` history:

```
feat(gateway): auth backstop — 401 tokenless requests on non-public routes (ADS-1255)
fix(deploy): keep host secret files so a reboot doesn't strand services (ADS-1247)
fix(notifications): stop logging recipient PII and email tokens (ADS-1257)
test: gate coverage on non-lib packages, restore disabled lib gates (ADS-1243)
docs(backend): correct stale command and migration-naming examples
```

## Types

| Type       | Use for                                               | Triggers release? |
| ---------- | ----------------------------------------------------- | ----------------- |
| `feat`     | New user-facing feature or capability                 | minor bump        |
| `fix`      | Bug fix visible to users or callers                   | patch bump        |
| `docs`     | Docs only (READMEs, CLAUDE.md, ADRs, skill files)     | no bump           |
| `refactor` | Code restructure with no behaviour change             | no bump           |
| `test`     | Test-only changes (new tests, refactored tests)       | no bump           |
| `chore`    | Build, deps, tooling, internal housekeeping           | no bump           |
| `perf`     | Performance improvement                               | patch bump        |
| `style`    | Whitespace, formatting (rare — Prettier handles most) | no bump           |
| `ci`       | CI config (GitHub Actions, etc.)                      | no bump           |
| `build`    | Build system / external deps (Webpack, npm scripts)   | no bump           |

`docs`, `test`, `ci`, `chore`, `build` and `style` are hidden from the generated
changelog (`release-please-config.json`). There is **no `revert` changelog
section** — a revert is not a recognised release type here; write the reversal as
the appropriate `fix`/`chore` instead.

**Use `feat` only for things a user can observe.** Internal additions that don't
change behaviour are usually `refactor` or `chore`.

## Scopes

Scope is the area of the codebase affected. Scopes are **advisory** — commitlint
does not enforce a scope enum (`commitlint.config.js` is
`config-conventional` only), so consistency is a convention, not a gate.

Scopes actually seen on recent `main` (use these where they fit):

`deploy`, `gateway`, `auth`, `applications`, `rescue`, `notifications`,
`security`, `authz`, `observability`, `frontend`, `backend`, `ci`, `adr`,
`review`, `docs`.

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
- The ticket goes in the subject `(ADS-NNN)`, not in a footer

```
fix(applications): close submitDraft draft-privacy authz gap (ADS-1225)

submitDraft read the draft before checking the caller owned it, so a
different authenticated user could probe another adopter's draft. Moved
the ownership check ahead of the read and covered it with a handler test.
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

Only two footers are used in this repo:

- `BREAKING CHANGE: <description>` — see above
- `Co-authored-by: Name <email>` — multi-person commit

The Linear ticket does **not** go in a footer — it goes in the subject as
`(ADS-NNN)`. There is no `Refs:` / `Closes:` convention here.

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
- Ticket at the front of the subject (`feat: ADS-712 add foo`) → put it at the
  end in parentheses (`feat: add foo (ADS-712)`)
- Skipping the type → commitlint rejects the commit at pre-commit

## Quick reference

```
feat(scope): short imperative summary (ADS-NNN)

[Optional body explaining WHY, wrapped at 72 cols.]
```

That's it. Match the existing log style (`git log --oneline -20`) when in
doubt.

Canonical doc: [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — the commits
section there is the human-facing companion to this skill; keep the two in sync.
