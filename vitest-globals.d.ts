// Vitest runs with `globals: true` (see vitest.shared.config.ts), so test files use
// describe/it/expect/vi without importing them. Workspace `tsconfig.typecheck.json`
// programs include this file so those globals type-check. Build programs do not, so
// the globals never leak into production source or emitted output.
/// <reference types="vitest/globals" />
