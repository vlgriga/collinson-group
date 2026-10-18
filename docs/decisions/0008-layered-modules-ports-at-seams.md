# 0008. Layered feature modules with ports at the I/O seams
- Status: Accepted
- Date: 2026-10-18

## Context
[ADR 0001](0001-monolith-postgres-pg-boss.md) settles the deployment shape: one codebase, two processes (`api`, `worker`). It does not settle how the code inside is organised. The original layering, `graphql → ranking → {locations, weather, scoring}`, has no place for `jobs/`. Yet `ranking` must enqueue refreshes and run the cold-miss fetch, and `jobs` must call weather ingest. Concrete imports in both directions would couple the request logic to pg-boss and risk a cycle.

## Decision
- **Modular monolith:** code is grouped by feature (`locations`, `weather`, `scoring`, `ranking`, `jobs`), not by technical layer. Each module exposes a small public surface through its `index.ts`, and other modules import only from that file.
- **Layered** inside the codebase: inbound adapter (`graphql`, job handlers) → application service (`ranking`) → domain logic (`scoring`) and outbound adapters (`locations`, `weather`, `jobs`, `db`).
- **Ports at the I/O seams only:** `ranking/ports.ts` declares the interfaces the core needs, namely `LocationResolver`, `ForecastReader`, `ForecastFetcher`, `RefreshScheduler` and `Clock`. `locations`, `weather` and `jobs` implement them. `scoring` is pure and needs no ports.
- **Composition roots:** `api.ts` and `worker.ts` are the only places that construct concrete classes and wire them together.

Dependency rule: `graphql → ranking ← {locations, weather, jobs}`; `ranking → scoring`; everything → `{db, shared, config}` as needed; `jobs → weather` (the fetch job runs ingest).

## Consequences
- No cycles: `ranking` depends on interfaces it owns, never on pg-boss, Drizzle or HTTP clients.
- Ports keep `ranking` independent of infrastructure, not replaceable in tests: services are tested through the real composition against real Postgres and pg-boss, with only Open-Meteo faked ([testing](../testing.md#isolating-dependencies)).
- A module could later be extracted into a service by swapping its adapter, without touching `ranking`.
- Cost: about five interface declarations and explicit wiring in two entrypoints.

## Alternatives considered
- **Microservices / SOA** — separate geocoding, weather and scoring services. This adds network hops, distributed failure modes and deployment overhead for one query and five tables. It is the path if the team or load grows, and the module boundaries keep it open.
- **MVC** — a UI-oriented pattern. There are no views here; GraphQL resolvers already fill the controller role.
- **Serverless (FaaS)** — cron, a queue and persistent Postgres pools fit poorly with per-invocation functions. It works against ADR 0001.
- **Plain layering with concrete imports** — fewer files, but `ranking` would import pg-boss code from `jobs`, coupling the request logic to the queue and risking a cycle.
- **Full Clean Architecture / DDD** (entities, value objects, use-case classes, a port for every dependency) — very explicit, but the ceremony far outweighs the domain's size.
