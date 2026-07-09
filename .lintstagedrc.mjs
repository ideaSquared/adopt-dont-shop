// ADS-905: lint-staged config extracted from package.json so the ESLint step
// can use the function form (not expressible in package.json's plain JSON).
//
// Previously `eslint --fix --quiet` ran once from the repo root against the
// staged files directly. The root eslint.config.js is a deliberately lean,
// shared config (see its own comment) used only so pre-commit doesn't error
// on plugin-namespaced directives — it does NOT carry each package's own
// rule severities the way CI does. Routing through `turbo run lint` instead
// scopes ESLint to each touched package's *own* config (matching CI) and,
// via turbo's package graph + cache, only re-lints packages that actually
// changed rather than evaluating every package's config up front.
export default {
  '**/*.{ts,tsx}': files => [
    `prettier --write ${files.map(f => JSON.stringify(f)).join(' ')}`,
    'pnpm exec turbo run lint --filter=...[HEAD] --continue',
  ],
  '**/*.{js,jsx,json,md,css}': ['prettier --write'],
};
