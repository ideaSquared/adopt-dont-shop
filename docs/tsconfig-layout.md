# tsconfig Layout (ADS-988)

The workspace's TypeScript configs are layered so that shared compiler
options live in one place instead of being copy-pasted into every package.

```
tsconfig.base.json              # root — strict mode, module/moduleResolution,
│                                # target ES2022, declaration/sourceMap output
├── tsconfig.lib.base.json      # frontend packages/lib.* — overrides target
│   │                           # to ES2020 (Vite/browser bundling), sets
│   │                           # allowSyntheticDefaultImports + noEmit:false
│   └── packages/lib.*/tsconfig.json
│
└── tsconfig.service.base.json  # services/* + the Node-only shared packages
    │                           # (authz, config-secrets, db, events,
    │                           # observability, proto, seed-faker,
    │                           # service-bootstrap, storage, test-utils) —
    │                           # target stays ES2022 (inherited, no override
    │                           # needed), sets noEmit:false
    └── services/*/tsconfig.json
```

`apps/*/tsconfig.json` (admin, client, rescue) extend `tsconfig.base.json`
directly rather than through an intermediate tier. They happen to also
target ES2020, but each carries enough bespoke, non-shared configuration
(JSX, DOM lib, path aliases, `tsconfig.node.json` project references) that
an intermediate app-tier config wasn't worth introducing — see ADS-988 for
the scoping decision.

## What each leaf config still declares directly

Per-package options that are inherently package-relative — `outDir`,
`rootDir`, `tsBuildInfoFile` — **must** stay in the leaf `tsconfig.json`,
never in an intermediate base file. TypeScript resolves relative paths in
`compilerOptions` against the config file that declares them, not the file
that extends it — if `outDir: "./dist"` were declared in
`tsconfig.lib.base.json` (at the repo root), every lib would emit into
`<repo-root>/dist` instead of its own `dist/`. Genuinely package-specific
flags (`types`, `lib`, `jsx`, `isolatedModules` where it varies,
`noUnusedLocals`/`noUnusedParameters` where a package hasn't adopted them
yet, etc.) also stay in the leaf config rather than being forced into the
shared tier, to avoid silently changing a package's behaviour as a side
effect of this consolidation.

## Intentional per-package overrides

A leaf config's own explicit value always wins over the tier base it
extends. Two packages deliberately override `noEmit`:

- `packages/lib.components/tsconfig.json` — `noEmit: true` (ships source for
  Storybook / `vite-plugin-dts`, not a `tsc` build).
- `packages/test-utils/tsconfig.json` — `noEmit: true` (type-only test
  helpers, never built to `dist`).

Both carry an inline comment at the override site explaining why.
