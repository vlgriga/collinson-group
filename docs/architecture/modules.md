# Modules

> Related: [Architecture](README.md) · [Ports](ports.md) · [ADR 0008](../decisions/0008-layered-modules-ports-at-seams.md)

## The modules

| Module | Owns |
|---|---|
| `graphql/` | The schema, thin resolvers, the mapping of errors to response codes |
| `ranking/` | The use case: answering a ranking request, and the ports it needs |
| `locations/` | Turning a name into a place, and the places already known |
| `weather/` | Fetching forecasts, turning them into daily rows, storing and reading them |
| `scoring/` | Scoring a day per activity, and aggregating days into a week |
| `jobs/` | The job queue: scheduling, running and retrying background work |
| `db/` | The database client, the schema and the migrations |
| `config/` | The validated environment and the typed configuration |
| `shared/` | What every module may use: logging, domain errors, dates, the HTTP helper |

```
src/
  api.ts  worker.ts    # entrypoints and composition roots
  config/  db/  shared/
  graphql/  ranking/  locations/  weather/  scoring/  jobs/
test/                  # mirrors src/, see testing.md
```

## Dependencies

```
graphql → ranking ← {locations, weather, jobs}
ranking → scoring
jobs → weather
any module → {db, shared, config}
```

- Dependencies point one way. A cycle is a design error, not an import to work around.
- `ranking` depends only on its own [ports](ports.md); the modules that implement them depend on
  `ranking`, not the other way round.
- `scoring` imports nothing but `shared` types and `config`.

## Boundaries

- A module is used through its `index.ts`; another module's files are not imported directly.
- What a module does not export from `index.ts` is private to it, tests included.
- Files are named for what they hold, in `kebab-case`; a module's name is its domain, not its
  technology.
