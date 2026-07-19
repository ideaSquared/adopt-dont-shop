# Dependency Graph

[![Dependency graph](https://img.shields.io/badge/dependency--graph-auto--generated-informational)](./dependency-graph.html)

This monorepo is wired together by Turborepo. The dependency graph captures every workspace package (apps, libraries, the `services/*` backend services) and the `^build` edges between them — i.e. which packages must finish building before a consumer can start. Generating and reading it is the fastest way to understand the blast radius of a change and to debug Turbo cache or ordering surprises.

## Generate the graph

```bash
pnpm graph         # renders docs/dependency-graph.html (open in a browser)
pnpm graph:tasks   # prints the task graph to stdout (no file written)
```

`pnpm graph` shells out to `turbo run build --graph=docs/dependency-graph.html`. The `.github/workflows/dependency-graph.yml` workflow (ADS-957) regenerates this file on every push to `main` and commits it, so `docs/dependency-graph.html` in the repo is always current — open it directly (or clone and open locally) rather than generating it by hand. Run `pnpm graph` yourself only when you need an up-to-date picture on a branch before it merges.

## Who consumes a library?

Every `lib.*` package has an auto-generated consumer list at [`docs/libraries/<lib>-consumers.md`](./libraries/README.md), linked from that package's own README and from the ["Library consumer lists"](./README.md#library-consumer-lists) section of the docs index. Check it before making a breaking change to a `lib.*` package's public API — `scripts/generate-dependency-docs.mjs` (also run by the same workflow) parses every workspace `package.json` to build the list, so it never drifts from the actual dependency graph.

## Layered architecture

Builds flow strictly up the layers; no layer ever depends downward:

```
lib.types                    # zero-dependency type definitions
   |
   v
other lib.*                  # lib.api, lib.auth, lib.components, lib.utils, ...
   |
   v
apps (app.admin, app.client, app.rescue) + services/* (gateway, auth, pets, ...)
```

- **lib.types** is the foundation. It exports shared TypeScript types and Zod schemas with no workspace dependencies of its own.
- **Other libraries** (`lib.api`, `lib.auth`, `lib.components`, etc.) depend on `lib.types` and occasionally on each other (e.g. `lib.api` consumes `lib.auth`).
- **Apps** (`app.admin`, `app.client`, `app.rescue`) and the **`services/*`** backend services sit at the top — they consume the libraries but nothing consumes them.

### Why changing lib.types cascades

Because `lib.types` sits at the bottom, every other workspace transitively depends on it. A change to `lib.types` invalidates the Turbo cache for every downstream library, which in turn invalidates every app and `services/*` package. Expect `pnpm build` after a `lib.types` edit to rebuild essentially the whole graph. Conversely, editing an isolated leaf like `app.admin` only rebuilds that one package.

If you want to see this in action, generate the graph and trace the inbound edges into `lib.types` — that fan-out is the cascade.

## CI pipeline ordering

The CI workflows mirror the same layered ordering:

```
build-libs  ->  (test-services || test-frontend || test-libs)  ->  test-e2e
```

1. **build-libs** — compile every `lib.*` first so downstream jobs can consume the built artefacts.
2. **test-services / test-frontend / test-libs** — run in parallel once the libraries are built; none of them depend on each other.
3. **test-e2e** — runs last, after backend + frontend test jobs pass, since it exercises the full stack.
