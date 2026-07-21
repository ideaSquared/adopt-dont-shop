# @adopt-dont-shop/eslint-config-base

## Purpose

The shared base ESLint flat config for TypeScript packages in the monorepo:
`typescript-eslint` recommended rules plus Prettier integration
(`eslint-plugin-prettier` + `eslint-config-prettier`). The Node and React
config packages extend this one, so a rule change here propagates everywhere.

This is a service-only shared tooling package (not a `lib.*`) — it ships
config, not runtime code. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

The root of the lint-config hierarchy —
[`@adopt-dont-shop/eslint-config-node`](../eslint-config-node/README.md) and
[`@adopt-dont-shop/eslint-config-react`](../eslint-config-react/README.md)
both spread this config first. Consumed by each workspace's `eslint.config.js`.
See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit.

## Scripts

None — this is a config-only package with no build, test, or dev step. It is
consumed directly as a flat-config module. Lint the whole workspace from the
repo root with `pnpm lint`.

## Public API / exports

Default export ([`index.js`](index.js)): a `typescript-eslint` flat-config
array. Consume it in a workspace `eslint.config.js`:

```js
import base from '@adopt-dont-shop/eslint-config-base';
export default [...base /* , local overrides */];
```

`eslint`, `typescript-eslint`, `eslint-config-prettier`, and
`eslint-plugin-prettier` are peer dependencies.

## Environment variables consumed

None.

## Testing notes

No test suite — the config is exercised by every package's `pnpm lint` run in
CI (`quality.yml`). A rule change is validated by linting the whole workspace.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
