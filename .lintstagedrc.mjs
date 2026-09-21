// ADS-905: lint-staged config extracted from package.json so the ESLint step
// can use the function form (not expressible in package.json's plain JSON).
//
// Previously `eslint --fix --quiet` ran once from the repo root against the
// staged files directly, using the root eslint.config.js — which doesn't
// carry each package's own rule severities the way each package's own config
// (and CI) does. Routing through `turbo run lint` instead scopes ESLint to
// each touched package's *own* config (matching CI) and, via turbo's package
// graph + cache, only re-lints packages that actually changed rather than
// evaluating every package's config up front. The root eslint.config.js (see
// its own comment) is no longer part of this pre-commit path at all — it's
// kept only for editor tooling and standalone root-level `eslint .` runs.
export default {
  '**/*.{ts,tsx}': files => [
    `prettier --write ${files.map(f => JSON.stringify(f)).join(' ')}`,
    // No surrounding quotes: lint-staged (string-argv + tinyexec) spawns this
    // command without a shell, so quotes are never stripped and are passed
    // to turbo literally (`--filter='"...[HEAD]"'`), breaking every
    // pre-commit run. No shell also means no glob risk from `[HEAD]`, so the
    // quotes were unnecessary as well as broken.
    'pnpm exec turbo run lint --filter=...[HEAD] --continue',
  ],
  '**/*.{js,mjs,jsx,json,md,css}': ['prettier --write'],
};
