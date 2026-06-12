# Dependency Graph

This monorepo is wired together by Turborepo. The dependency graph captures every workspace package (apps, libraries, the backend service) and the `^build` edges between them — i.e. which packages must finish building before a consumer can start. Generating and reading it is the fastest way to understand the blast radius of a change and to debug Turbo cache or ordering surprises.

## Generate the graph

```bash
pnpm graph         # renders docs/dependency-graph.html (open in a browser)
pnpm graph:tasks   # prints the task graph to stdout (no file written)
```

`pnpm graph` shells out to `turbo run build --graph=docs/dependency-graph.html`. The generated HTML is git-ignored — regenerate it locally whenever you need an up-to-date picture.

## Layered architecture

Builds flow strictly up the layers; no layer ever depends downward:

```
lib.types                    # zero-dependency type definitions
   |
   v
other lib.*                  # lib.api, lib.auth, lib.components, lib.utils, ...
   |
   v
apps (app.admin, app.client, app.rescue) + service.backend
```

- **lib.types** is the foundation. It exports shared TypeScript types and Zod schemas with no workspace dependencies of its own.
- **Other libraries** (`lib.api`, `lib.auth`, `lib.components`, etc.) depend on `lib.types` and occasionally on each other (e.g. `lib.api` consumes `lib.auth`).
- **Apps** (`app.admin`, `app.client`, `app.rescue`) and **`service.backend`** sit at the top — they consume the libraries but nothing consumes them.

### Why changing lib.types cascades

Because `lib.types` sits at the bottom, every other workspace transitively depends on it. A change to `lib.types` invalidates the Turbo cache for every downstream library, which in turn invalidates every app and `service.backend`. Expect `pnpm build` after a `lib.types` edit to rebuild essentially the whole graph. Conversely, editing an isolated leaf like `app.admin` only rebuilds that one package.

If you want to see this in action, generate the graph and trace the inbound edges into `lib.types` — that fan-out is the cascade.

## CI pipeline ordering

The CI workflows mirror the same layered ordering:

```
build-libs  ->  (test-backend || test-frontend || test-libs)  ->  test-e2e
```

1. **build-libs** — compile every `lib.*` first so downstream jobs can consume the built artefacts.
2. **test-backend / test-frontend / test-libs** — run in parallel once the libraries are built; none of them depend on each other.
3. **test-e2e** — runs last, after backend + frontend test jobs pass, since it exercises the full stack.
