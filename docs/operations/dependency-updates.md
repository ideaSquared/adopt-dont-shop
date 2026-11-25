# Dependency Updates — Dependabot [ADS-706]

How automated dependency updates are configured and reviewed in this repo (audience: maintainers triaging Dependabot PRs).

Automated dependency updates are managed by [Dependabot](https://docs.github.com/en/code-security/dependabot),
configured in [`.github/dependabot.yml`](../../.github/dependabot.yml). It replaced Renovate; the grouping
and the 3-day release delay carry over. Each ecosystem runs weekly, on Monday at 03:00 Europe/London, so PRs
land in a predictable window.

| Ecosystem        | Directory         | What it updates                                             |
| ---------------- | ----------------- | ----------------------------------------------------------- |
| `npm`            | `/`               | the whole pnpm workspace, through the root `pnpm-lock.yaml` |
| `github-actions` | `/`               | `uses:` SHA pins in `.github/workflows` and local actions   |
| `docker`         | `/`               | digest pins in `Dockerfile.*`                               |
| `docker-compose` | `/`               | digest pins on the `image:` lines of the root compose files |
| `docker-compose` | `/deploy/gateway` | the nginx and certbot images of the gateway host            |

## How updates are grouped

To avoid PR fatigue across this monorepo, related packages are grouped into single PRs. The first matching
group wins, so the specific groups sit ahead of the catch-all:

- **`react`** — `react`, `react-dom`, and their `@types/*` packages move together, any update type.
- **`typescript-eslint`** — `typescript-eslint` and `@typescript-eslint/*` move together.
- **`vitest`** — `vitest` and `@vitest/*` move together.
- **`prettier`** — `prettier` alone, any update type. A new release can restyle files and fail
  `format:check`; on its PR run `pnpm format` and commit the result.
- **`minor-and-patch`** — every other minor and patch update of an ecosystem in one PR. Majors arrive as
  their own PRs for review.

## Limits and delay

- `cooldown.default-days: 3` skips a release for its first three days (a just-yanked release never reaches
  a PR). It does not delay security updates.
- At most 5 open Dependabot PRs per ecosystem.
- Commits use the `chore(deps)` prefix and the `dependencies` + `DevEx` labels. `commitlint.config.js` skips
  only commits that are shaped like a bump and signed off by the Dependabot bot.
- Majors of `@types/node` and of the `node` Docker image are ignored: Node 24 is the pinned runtime and a new
  Node major is a deliberate change.
- Majors of the `postgis/postgis` image are ignored: a new Postgres major refuses to start on the old major's
  data volume, so it is a planned `pg_upgrade` of every host.
- Nothing automerges. CI must be green and a reviewer approves every PR.

## Things Dependabot does not do

- **`pnpm.overrides` pins.** The exact `react`, `react-dom`, `@types/react` and `@types/react-dom` pins in the
  root `package.json` force the resolved version (see `overridesDocumentation.react`, ADS-1111). When the
  `react` group PR merges, bump those pins to the same versions by hand, or the override drifts from the
  ranges. `pnpm check:overrides-docs` guards the documentation of overrides, not their versions.
- **Lockfile-only refreshes.** There is no scheduled "lock file maintenance". Refresh with `pnpm update` when
  needed.
- **The `NODE_VERSION` build arg** in the Dockerfiles. The tag comes from the arg, so bump `NODE_VERSION` and
  the digest together (see the comment above each `FROM`).
- **`shipper-ref` inputs** in `ship.yml`. A `uses:` bump of shipper must be matched by hand; `pnpm
check:shipper-pins` fails CI until they agree.

## Security updates

Dependabot alerts and Dependabot security updates are enabled in the repository settings. Security-update PRs
are opened outside the schedule, groups and cooldown above. A CVE is gated by the CI surfaces in
[dependency-policy.md](../security/dependency-policy.md), not by waiting for a routine PR.
