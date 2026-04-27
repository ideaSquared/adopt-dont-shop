// ESLint flat config (v9+) for the monorepo root.
// Individual packages under lib.*/app.*/service.backend/ maintain their own
// .eslintrc.* configs and are linted from within those package directories.
// This root config satisfies ESLint v9+ tooling (e.g. lint-staged) without
// duplicating package-level rules.
export default [];
