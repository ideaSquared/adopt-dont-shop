# ADR 0010 — Frontend quality gates: a11y lint, no-non-null-assertion, container CSP, coverage floors (ADS-1055)

- Status: Proposed
- Date: 2026-08-05
- Scope: `packages/eslint-config-react`, `packages/eslint-config-base`,
  `packages/eslint-config-node`, `Dockerfile.app`,
  `services/gateway/src/routes/users.ts` (proto-assertion hotspot),
  `apps/rescue` + `apps/client` vitest coverage thresholds (proposal only —
  no code or config changed in this PR)

## Context

ADS-1055 (under epic ADS-1039) flags four frontend quality gates that have
quietly eroded. Each was verified against the current tree before writing this
ADR; the specifics matter because the fixes differ per concern.

**1. Accessibility linting is disabled.** `packages/eslint-config-react/index.js:6`
carries `// TODO: re-add eslint-plugin-jsx-a11y once it supports eslint 10`, and
the shared React config never registers the plugin or any of its rules. So
`alt`/label/ARIA/keyboard-handler regressions land invisibly across all three
apps, even though the repo ships an `accessibility` skill that asks contributors
to meet WCAG targets. The stated blocker — no eslint-10-compatible release — no
longer holds; `eslint-plugin-jsx-a11y` publishes a flat-config build that runs
under eslint 10.

**2. No `no-non-null-assertion` rule.** None of the three ESLint layers
(`packages/eslint-config-base`, `eslint-config-node`, `eslint-config-react`)
enables `@typescript-eslint/no-non-null-assertion`, so the `!` operator is
unguarded despite the repo's "no type assertions without clear justification"
guideline. A
grep for the non-null-assertion form across `apps/*/src` and
`services/gateway/src` (excluding tests) returns on the order of 50–90 sites
(approximate — the exact figure depends on how strictly comments/strings are
filtered; the ticket cites ~50–60). The hotspot is
`services/gateway/src/routes/users.ts`, which alone carries ~16, every one of
them on a proto response field the code assumes is populated —
e.g. `composePreferences(notif.preferences!, privacy.preferences!)`
(`services/gateway/src/routes/users.ts:311`, `:375`, `:421`) and
`AuthV1.User.toJSON(res.user!)` (`:599`, `:668`, `:725`, `:773`, `:1351`). Each
`!` is a silent runtime-crash risk if the upstream service ever returns the
optional field unset.

**3. The container-baked CSP is far broader than the proxy's.** `Dockerfile.app`
bakes an nginx `Content-Security-Policy` into `/etc/nginx/security-headers.conf`
with `connect-src 'self' wss: https:` (`Dockerfile.app:191`). That permits the
SPA to open an XHR/fetch/WebSocket to _any_ `https:`/`wss:` origin. The proxy
layer, by contrast, pins the exact API host: the app vhosts in
`nginx/nginx.prod.conf` set `connect-src 'self' https://api.__PROD_HOSTNAME__ wss://api.__PROD_HOSTNAME__`
(`nginx/nginx.prod.conf:149`, `:181`, `:266`; the api vhost itself narrows to
`connect-src 'self'`, `:213`), and `deploy/gateway/nginx.conf` pins the same
`https://api.adoptdontshop.com wss://api.adoptdontshop.com`
(`deploy/gateway/nginx.conf:150`, `:272`). The layered policies disagree: in
normal operation the outer proxy's tighter header wins, but if an app container
is ever served directly (a preview env, a misrouted deploy, a compromised
proxy), the baked-in `connect-src` is the only policy in force and it allows
exfiltration to an attacker-controlled origin. A defence-in-depth control should
not depend on a second layer always being present.

**4. App coverage floors are low for user-facing flows.** The per-app vitest
thresholds are:

- `apps/rescue/vitest.config.ts:36` — statements 40, branches 37, functions 35,
  **lines 40**.
- `apps/client/vitest.config.ts:42` — statements 55, branches 41, functions 41,
  **lines 57**.
- `apps/admin/vitest.config.ts:42` — statements 62.5, branches 50, functions 50,
  lines 65 (higher, shown for contrast).

The two adopter/rescue-facing apps — the ones carrying the primary user journeys
(swipe/discovery, applications, profile) — have the weakest floors. Both were
"ratcheted to measured baseline (2026-06-16); buffered for CI variance" per the
inline comments, i.e. the number tracks _what coverage happens to be_, not a
target the team is climbing toward.

## Options considered

Four independent sub-decisions; each has its own options and tradeoffs.

### a11y linting

- **A. Re-enable `eslint-plugin-jsx-a11y` in `eslint-config-react`.** Restores
  static checks at author time / in CI for every app and lib that extends the
  React config. Catches the common regressions (missing `alt`, unlabelled
  controls, click-without-key handlers) cheaply. Downside: turning it on against
  an existing codebase surfaces a backlog at once; if added as `error` it blocks
  every PR touching an offending file until fixed.
- **B. Add `axe` (e.g. `@axe-core/playwright`) to the e2e suite.** Tests the
  _rendered_ DOM, so it catches runtime/dynamic issues static lint can't. But it
  only covers pages the e2e suite actually drives, runs late (full-stack, slow),
  and gives coarser file-level attribution than a lint error on the JSX line.
- **C. Both.** Static lint as the fast first line; axe as runtime defence for the
  critical journeys. More setup, best coverage.

### `no-non-null-assertion`

- **A. Enable as `error` immediately.** Honest and enforced, but requires fixing
  all ~50–90 sites in the same change — a large, cross-cutting diff that fights
  the "small increments" rule and risks rushed guard code.
- **B. Enable as `warn`, then ratchet to `error`.** Surfaces every site without
  blocking, lets the count be driven down incrementally, then flips to `error`
  once near zero. Slower, and a `warn` can be ignored indefinitely without a
  follow-up commitment.
- **C. Enable as `error` with targeted `eslint-disable` on the proto hotspots +
  a follow-up to remove them.** Enforced everywhere new, with the known gateway
  cluster explicitly exempted. Downside: scatters `eslint-disable` comments that
  tend to become permanent.

### container CSP

- **A. Tighten `Dockerfile.app`'s `connect-src` to match the proxy's pinned
  policy** (parameterised per environment). Removes the exfiltration surface even
  when the container is served without the proxy — true defence-in-depth. Cost:
  the baked header must learn the API host, so it needs a build `ARG` or a
  runtime env substitution at container start, and a too-tight value breaks
  legitimate API/WebSocket traffic if the host is wrong.
- **B. Rely solely on the proxy; accept the risk.** Zero work, and in the
  documented topology the proxy header always wins. But it leaves a latent
  misconfiguration where a single routing mistake exposes an
  exfiltration-friendly policy — exactly the "served without the outer proxy"
  threat model the ticket calls out.

### coverage floors

- **A. One-shot raise** to a target (e.g. rescue/client lines → 70/75). Clear
  destination, but a large jump likely lands red immediately and forces a big
  test-writing push before anything merges.
- **B. Incremental ratchet per app.** Nudge each floor up a few points per PR as
  tests are added, keeping CI green throughout. Slower to reach the target but
  never blocks the pipeline; matches how the floors were set originally.

## Decision

A defensible recommendation per concern, formed from the evidence above. This is
a proposal — nothing here is applied in this PR.

- **a11y — re-enable `eslint-plugin-jsx-a11y` now (Option A), pursue axe later
  (toward C).** The original blocker is gone, and static lint is the cheapest,
  most localised signal. Introduce it at the plugin's `recommended` set but at
  `warn` severity first so the existing backlog is visible without blocking every
  PR, then promote the high-value rules to `error` once the backlog is burned
  down. Add axe to the e2e critical-journey specs as a follow-up for runtime
  defence; it complements rather than replaces the lint.
- **`no-non-null-assertion` — add as `warn`, then ratchet to `error`, with the
  gateway proto hotspot cleaned up first (Option B, informed by C).** Clean
  `services/gateway/src/routes/users.ts` up front by replacing the `res.user!` /
  `*.preferences!` assertions with an explicit guard/assert helper (a proto
  response missing a field is a real error worth surfacing, not asserting away),
  then enable the rule repo-wide at `warn` and drive the remaining count down
  before flipping to `error`. Avoids both a giant one-shot diff and a scatter of
  permanent `eslint-disable` comments.
- **CSP — tighten the container CSP to match the proxy (Option A).** Mirror the
  proxy's pinned `connect-src` in `Dockerfile.app`, parameterised by the
  environment's API host, so the container is safe on its own. Defence-in-depth
  is the whole point of a baked header; relying solely on the proxy defeats it.
- **coverage — incremental ratchet per app (Option B).** Nudge the rescue and
  client floors upward a few points at a time toward an agreed target, keeping CI
  green. Prioritise the rescue app (lowest floors, core rescue-staff journeys).

## Implementation sketch

Concrete, described-not-applied changes. **None of this is committed in this
PR** — the fences are illustrative of the eventual follow-up work.

**a11y — `packages/eslint-config-react/index.js`** (remove the `:6` TODO, wire
the plugin's flat config):

```js
import jsxA11y from 'eslint-plugin-jsx-a11y';
// ...
export default [
  ...baseConfig,
  pluginReact.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended, // ADS-1055: re-enabled (eslint-10 support now ships)
  {
    // ...existing plugins/settings/rules...
    rules: {
      // Start soft to surface the backlog without blocking, then ratchet
      // the high-value rules to 'error'.
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      // ...
    },
  },
];
```

**`no-non-null-assertion` — `packages/eslint-config-base`** (add the rule to the
shared base so every layer inherits it):

```js
rules: {
  // ADS-1055: enable as warn first; ratchet to 'error' once the count nears zero.
  '@typescript-eslint/no-non-null-assertion': 'warn',
}
```

Clean the gateway hotspot first, e.g. replace
`AuthV1.User.toJSON(res.user!)` with a guarded read:

```ts
if (!res.user) throw new Error('adminUpdateUser: response missing user');
return reply.send({ success: true, data: AuthV1.User.toJSON(res.user) });
```

**CSP — `Dockerfile.app:191`** (tighten `connect-src` to the pinned host,
parameterised so the baked header is not hard-coded to one environment):

```dockerfile
ARG API_ORIGIN=https://api.example.com
ARG API_WSS=wss://api.example.com
# ...connect-src 'self' ${API_ORIGIN} ${API_WSS}; ...   (was: connect-src 'self' wss: https:)
```

**coverage — ratchet the two low apps** (one small bump per PR):

```ts
// apps/rescue/vitest.config.ts:36
thresholds: { statements: 45, branches: 42, functions: 40, lines: 45 }, // was 40/37/35/40

// apps/client/vitest.config.ts:42
thresholds: { statements: 60, branches: 46, functions: 46, lines: 62 }, // was 55/41/41/57
```

## Risks & rollout

- **Lint churn.** Turning on jsx-a11y and `no-non-null-assertion` against an
  existing tree surfaces a backlog immediately. Starting both at `warn` keeps CI
  green while the counts are driven down; the ratchet-to-`error` step is a
  separate, deliberate PR per rule so the blocking change is small and reviewable.
- **eslint-10 / jsx-a11y compatibility.** The plugin must be on a flat-config,
  eslint-10-compatible release; pin the version and confirm `pnpm lint` runs
  clean on the config change alone before enabling any rules. The sibling note in
  `index.js:17-21` about `eslint-plugin-react`'s `version: 'detect'` crash under
  eslint 10 is a reminder that plugin/eslint-version drift here is real — verify,
  don't assume.
- **CSP breaking legitimate traffic.** A too-tight `connect-src` blocks the very
  API/WebSocket calls the app needs. The container value must be parameterised
  per environment (build `ARG` or runtime substitution) and validated against the
  proxy's pinned host before rollout; ship behind a preview/staging check.
  Because the proxy header already wins in normal operation, this change is
  low-risk to production behaviour and high-value only in the degraded topology.
- **Coverage ratchet sequencing.** Raising a floor above current coverage turns
  CI red on the raising PR. Each bump must land _with_ the tests that justify it,
  a few points at a time, so no PR is blocked waiting on a large test backlog.
  Rescue first (lowest floors, core journeys), then client.

## Open questions for the maintainer

1. **jsx-a11y strictness:** start at the plugin's `recommended` set, or the
   stricter `strict` set? And which rules (if any) should be `error` from day one
   versus `warn`-then-ratchet?
2. **`no-non-null-assertion` target severity:** land as `warn` and ratchet, or go
   straight to hard `error` with the gateway hotspot exempted via
   `eslint-disable` — and is there appetite to fix all ~50–90 sites up front?
3. **CSP allowlist:** what exact `connect-src` origins should the container bake
   per environment (does the pinned `https://api.<host>` + `wss://api.<host>`
   fully cover it, or are there analytics/CDN/third-party endpoints the SPA also
   calls that the proxy currently permits by other means)?
4. **Coverage targets and timeline:** what line/branch floors are we climbing
   toward for rescue and client (e.g. parity with admin's 65 lines?), and over
   how many milestones?
5. **Enforcement home:** should any of these gates be blocking in CI now, or only
   after a warn-period grace window — and do we want axe-in-e2e tracked as its own
   follow-up ticket under ADS-1039?
