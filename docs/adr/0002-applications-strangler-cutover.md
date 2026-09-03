# ADR 0002 — Applications strangler-fig cutover plan

> **Superseded.** The per-domain `CUTOVER_<DOMAIN>` switches this ADR describes
> have been removed. The residual monolith was deleted (Phase 11) and the
> gateway now always registers a domain's routes when its gRPC client is wired —
> there is no flag and no fall-through. Retained for historical context and for
> the lessons below.

- Status: Superseded
- Date: 2026-06-06
- Scope: `services/applications`, `services/gateway` (residual monolith now deleted)
- Linear: —
- Supersedes / Superseded by: superseded by the completed migration (monolith
  deleted in Phase 11)

## Context

The applications domain was the pilot for the strangler-fig extraction: an
event-sourced `services/applications` microservice fronted by gateway REST
routes, cut over from the residual monolith in staged, individually-shippable
PRs behind per-domain `CUTOVER_<DOMAIN>` flags. Preparing that cutover surfaced
three blocking gaps — a path-version mismatch that left the extracted services
"dark", a response-shape divergence between proto-JSON and the frontend
contract, and a deep web of monolith `Application`-model consumers that had to be
peeled off one at a time before the model could be deleted. The plan sequenced
those into stages A–E so the final delete was the last, reversible-until-then
step. All of it has since shipped and the monolith is gone; the flags and the
staged plan no longer describe any live mechanism.

## View-adapter response-shape requirement (still current)

The one rule from this ADR that outlives the cutover: **gateway routes must
return the frontend contract, not raw ts-proto `toJSON` output** — a view adapter
maps proto-JSON to the frontend shape (and the inverse for requests). See the
view-adapter / response-shape section of
[`docs/backend/implementation-guide.md`](../backend/implementation-guide.md), with
`services/gateway/src/routes/applications-view.ts` as the reference.

## Lessons (for the Notion "Things that bit us" / "Things we'd do differently")

- **Verify the path, not just the route module.** A "gateway routes" PR that
  registers `/api/<domain>` while clients call `/api/v1/<domain>` is dark — it
  passes its own tests (which hit the registered path) but never serves a real
  request. Every prior vertical cutover shipped in this state. The route test
  must assert the path clients actually use, and an integration smoke must hit
  the gateway on the client's real URL.
- **A proto-JSON gRPC surface is not a drop-in REST replacement.** ts-proto
  `toJSON` (SCREAMING enum names, `*_json` blob fields, proto field names) and a
  hand-written REST contract diverge by default. Budget a translation layer per
  vertical, or migrate the client — don't assume transparency.
