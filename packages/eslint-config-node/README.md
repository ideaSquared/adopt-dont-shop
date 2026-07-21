# @adopt-dont-shop/eslint-config-node

## Purpose

The shared ESLint flat config for the Node.js backend services. Extends
[`@adopt-dont-shop/eslint-config-base`](../eslint-config-base/README.md) and
layers on backend-stricter rules (`no-console: error`,
`no-process-exit: error`), with a more lenient block for test files.

This is a service-only shared tooling package (not a `lib.*`) — it ships
config, not runtime code. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Consumed by each `services/*` workspace's `eslint.config.js`. Builds on the
base config — see
[`@adopt-dont-shop/eslint-config-base`](../eslint-config-base/README.md) — and
sits alongside
[`@adopt-dont-shop/eslint-config-react`](../eslint-config-react/README.md) for
the frontend. See [`docs/README.md`](../../docs/README.md#libraries) for where
the shared packages sit.

## Scripts

None — config-only package with no build, test, or dev step. Lint the
workspace from the repo root with `pnpm lint`.

## Public API / exports

Default export ([`index.js`](index.js)): the base flat-config array plus the
backend rule overrides. Consume it in a service's `eslint.config.js`:

```js
import node from '@adopt-dont-shop/eslint-config-node';
export default [...node /* , local overrides */];
```

Peer dependencies match the base config (`eslint`, `typescript-eslint`,
`eslint-config-prettier`, `eslint-plugin-prettier`).

## Environment variables consumed

None.

## Testing notes

No test suite — validated by every service's `pnpm lint` run in CI
(`quality.yml`).

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
