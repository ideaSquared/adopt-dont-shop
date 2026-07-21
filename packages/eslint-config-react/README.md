# @adopt-dont-shop/eslint-config-react

## Purpose

The shared ESLint flat config for the React applications. Extends
[`@adopt-dont-shop/eslint-config-base`](../eslint-config-base/README.md) and
layers on the React plugins (`eslint-plugin-react`, `react-hooks`,
`react-refresh`) with the flat `react.recommended` ruleset.

This is a service-only shared tooling package (not a `lib.*`) — it ships
config, not runtime code. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Consumed by each `apps/*` workspace's `eslint.config.js`. Builds on the base
config — see
[`@adopt-dont-shop/eslint-config-base`](../eslint-config-base/README.md) — and
is the frontend counterpart to
[`@adopt-dont-shop/eslint-config-node`](../eslint-config-node/README.md). See
[`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit.

## Scripts

None — config-only package with no build, test, or dev step. Lint the
workspace from the repo root with `pnpm lint`.

## Public API / exports

Default export ([`index.js`](index.js)): the base flat-config array plus the
React plugin config. Consume it in an app's `eslint.config.js`:

```js
import react from '@adopt-dont-shop/eslint-config-react';
export default [...react /* , local overrides */];
```

React version detection is pinned rather than `'detect'` — see the comment in
[`index.js`](index.js) for the `eslint-plugin-react` / ESLint 10 compatibility
reason. `eslint-plugin-react`, `eslint-plugin-react-hooks`, and
`eslint-plugin-react-refresh` are peer dependencies on top of the base set.

## Environment variables consumed

None.

## Testing notes

No test suite — validated by every app's `pnpm lint` run in CI
(`quality.yml`).

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
