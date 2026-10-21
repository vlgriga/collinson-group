# Style guide

Formatting is enforced by Prettier and ESLint (`typescript-eslint` strict + type-checked). This guide covers what tools can't.

## TypeScript
- `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
- ESM (`"type": "module"`), `moduleResolution: "NodeNext"`; relative imports include the `.js` extension.
- No `any`; use `unknown` and narrow. No non-null assertions (`!`) outside tests.
- Prefer `type` aliases for data shapes, `interface` only for contracts implemented by classes.
- Prefer plain functions and modules; classes only where state or DI make them clearer (services, clients).
- Named exports only; no default exports.
- Model closed sets as string-literal unions or `as const` objects, not TS `enum`.

## Naming
- Files and folders: `kebab-case.ts`; tests: `<subject>.<unit|int|e2e>.test.ts` under `test/`, mirroring `src/` (see [testing](testing.md#layout)).
- Types: `PascalCase`; functions/variables: `camelCase`; constants: `SCREAMING_SNAKE_CASE` only for true module-level constants.
- **Units in names** for physical quantities: `windSpeedKmh`, `waveHeightM`, `snowDepthCm`, `sunshineDurationS`. Convert at the boundary (ingest), never in scorers.

## Architecture rules
- Layering ([ADR 0008](decisions/0008-layered-modules-ports-at-seams.md)): `graphql → ranking ← {locations, weather, jobs}`, `ranking → scoring`, `jobs → weather`; anything may import `{db, shared, config}`. No cycles.
- `ranking` depends only on its own ports (`ranking/ports.ts`), never on pg-boss, Drizzle or HTTP clients. Adapters implement the ports.
- Modules import each other only through their `index.ts`; no deep imports into another module's files.
- Concrete classes are constructed and wired only in the composition roots (`api.ts`, `worker.ts` and the `app.ts` they share, [ADR 0010](decisions/0010-one-composition-function.md)).
- Resolvers are thin: validate/map input, call a service, map output. No business logic or DB access.
- `scoring/` is pure: no I/O, no `Date.now()`, no logging. Inputs in, `{ score, reasons, rated }` out.
- External data is validated with **zod** at the boundary (HTTP responses, env, GraphQL input); internal code trusts its types.
- Dependencies are passed explicitly (constructor or function params) — no hidden singletons — so the composition roots, and the test app built like them, decide what is wired. Tests substitute only third-party dependencies (Open-Meteo, the clock); see [testing](testing.md#isolating-dependencies).

## Dates and time
- Calendar days are `YYYY-MM-DD` strings in the location's timezone (`LocalDate` branded type), never JS `Date`.
- Instants (`fetchedAt`, `lastRequestedAt`) are UTC `Date` / `timestamptz`.
- Get "now" from an injected `Clock`, not `new Date()`, in services and jobs.

## Errors
- Throw typed domain errors from `shared/errors.ts` (`LocationNotFoundError`, `UpstreamUnavailableError`, `ValidationError`).
- The GraphQL layer maps domain errors to `extensions.code`; unknown errors become `INTERNAL_SERVER_ERROR` with details logged, not leaked.
- Never swallow errors silently; either handle with a documented fallback (e.g. serve stale data) or rethrow.

## Logging
The full design (sinks, library bridging, levels, rules) is in [logging.md](architecture/logging.md). In short:
- pino, structured: `logger.info({ locationId, durationMs }, 'forecast fetched')`. Message is a constant string; data goes in fields.
- Child loggers carry `requestId` / `jobId`.
- No `console.*`; no secrets or full upstream payloads in logs.
- Log a failure once, where it is handled. Client faults are `warn`; service faults are `error`.

## GraphQL
- Fields `camelCase`, types `PascalCase`, enum values `SCREAMING_SNAKE_CASE`.
- Non-null by default; nullable only when absence is meaningful (e.g. `score` when unavailable).
- Additive changes only; deprecate with `@deprecated(reason:)` before removing.
- Descriptions (`"""…"""`) on every type and field — the schema is the API documentation.

## Database
- Tables and columns `snake_case`, plural table names; Drizzle maps to `camelCase` in TS.
- Every table has `created_at`/`updated_at` (`timestamptz`); foreign keys and indexes declared explicitly.
- Writes that must be consistent use a transaction; bulk writes use a single `INSERT … ON CONFLICT`.

## Comments
- Explain *why*, not *what*. Scoring thresholds get a one-line rationale next to the config value.
