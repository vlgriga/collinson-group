# Activity Forecast Service

A GraphQL backend (Node.js, TypeScript) that takes a city or town and ranks how good each of the
next 7 days will be for **skiing, surfing, outdoor sightseeing and indoor sightseeing**, from
[Open-Meteo](https://open-meteo.com/) weather data persisted in Postgres.

The brief leaves the shape of the task open on purpose. The [product requirements](docs/prd.md) are
how it was read, and the [decisions](docs/decisions/) record what was chosen and what was rejected.
Activity ranking is built and tested end to end. Refresh, resilience and operations are designed
and not yet built ([what is built](#what-is-built-and-what-is-designed)).

## Run it

It needs Docker, with ports 4000 and 5432 free:

```bash
docker compose up --build
```

This starts Postgres, applies the migrations and serves the API at
<http://localhost:4000/graphql>; opened in a browser, that address is GraphiQL.

```graphql
query {
  activityRanking(city: "Biarritz", countryCode: "FR", days: 7) {
    location { name country admin1 latitude longitude timezone }
    forecastFetchedAt
    activities {
      activity
      available
      unavailableReason
      score
      bestDay
      days { date score rating reasons }
    }
  }
}
```

`countryCode` and `days` are optional. The service's own failures carry a code in
`extensions.code`: `BAD_USER_INPUT`, `LOCATION_NOT_FOUND`, or `UPSTREAM_UNAVAILABLE` when
Open-Meteo fails on a request that needs it: a name not yet geocoded, or a stored week that has run
out. A query the schema refuses gets GraphQL's own validation error, and an unexpected failure
`INTERNAL_SERVER_ERROR`.

To work on it, run the checks and the tests (they start their own Postgres in containers, so
Docker must be running): [getting started](docs/getting-started.md).

```bash
cp .env.example .env
make install && make migrate && make dev-api   # the API in watch mode
make gate                                      # lint, format, typecheck, every test, build
```

## What it does

1. **Resolves the place.** The name is geocoded with Open-Meteo, taking the top match; a country
   code narrows it. The response says which place it was taken to mean, so a wrong match
   ("Paris", Texas) is visible. Names already asked for are answered from a cache in Postgres.
2. **Loads the week.** Today and the next six days, in the place's own timezone, from Postgres; from
   Open-Meteo Forecast and Marine only when what is stored does not cover them (see
   [below](#weather-data-model-store-refresh)).
3. **Scores every day for every activity**, 0–100, with a rating (poor, fair, good, excellent) and
   the reasons that decided it, in English and metric units.
4. **Sums up each activity** as the mean of its days and its best day, and orders the activities
   best first. Surfing where Marine forecasts no sea is marked unavailable, with the reason, rather
   than scored low.

### Scoring

Each factor maps to a 0–1 sub-score on a piecewise-linear curve; the sub-scores are weighted and
summed, then hard caps apply to conditions that are dangerous or make the activity pointless.

| Activity | What decides a day | Capped when |
|---|---|---|
| Skiing | snow depth, fresh snow, temperature, gusts, sunshine | no snow on the ground; gusts that stop lifts |
| Surfing | wave height, swell period, wind, air temperature | waves over 4 m; thunderstorm |
| Outdoor sightseeing | precipitation, feels-like temperature, share of daylight in sun, wind, UV | thunderstorm; heavy rain or snow |
| Indoor sightseeing | the day outside, inverted: 50 on a perfect outdoor day, 100 on the worst | — |

It is a heuristic, not a validated model. Every weight, curve point and cap is typed configuration
in [`src/config/scoring.ts`](src/config/scoring.ts), each with the reason for its value. Scores are
computed on read, so tuning them needs no migration or backfill.

## Weather data: model, store, refresh

**Storage** is Postgres: one piece of infrastructure for the data now and for the job queue later
([ADR 0001](docs/decisions/0001-monolith-postgres-pg-boss.md)).

**Model.** Ranking is per day, so the forecast is stored per day
([ADR 0005](docs/decisions/0005-daily-granularity-upsert.md)):

| Table | Holds |
|---|---|
| `locations` | each place a name resolved to, with its timezone and whether it has a sea |
| `location_aliases` | each name asked for, and the place it resolved to: the geocoding cache |
| `daily_weather`, `daily_marine` | one row per place and local date, overwritten by each fetch, in metric units |
| `forecast_fetches` | each fetch, when it was made, and Open-Meteo's raw answer |

Only weather is stored; scores are not
([ADR 0004](docs/decisions/0004-compute-scores-on-read.md)). Units are converted at ingest (snow
depth m → cm, durations s → h), and hourly snow depth is reduced to its daily maximum. The week is
asked for as explicit dates in the place's timezone, so "today" and the stored dates are one
calendar ([ADR 0009](docs/decisions/0009-forecast-week-in-the-location-timezone.md)). The raw
answers allow re-extraction if a column is added.

**Refresh, as built: read-through by the day.** A request is answered from Postgres while the
stored days cover today and the next six; when they don't, that week is fetched inline, upserted
and answered. The week is fetched on a place's first request, and again on the first request after
its local midnight; there is no scheduled fetch, so a place nobody asks about is not fetched again.
Marine is not asked again where it found no sea. A repeated request on the same day, for a name
already asked for, does not reach Open-Meteo: locally, around 10 ms against about a second for a
cold one. The cost is that a stored forecast can be up to a day old.

**Refresh, as designed: hybrid** ([ADR 0002](docs/decisions/0002-hybrid-refresh-strategy.md),
[design](docs/design/refresh.md)):

- data is fresh for 3 hours after its latest successful fetch;
- stale data is answered at once, flagged `stale: true`, and a refresh is queued
  (stale-while-revalidate), so only a place never seen before waits for Open-Meteo;
- a `worker` process on pg-boss refreshes, every hour, the stale places asked about in the last 7
  days; a place nobody asks about drops out by itself;
- one job per place at a time (a pg-boss singleton key), so simultaneous first requests cause one
  fetch.

Upstream calls then grow with the number of active places, not with traffic.

## What is built and what is designed

| Feature | State | Design |
|---|---|---|
| Activity ranking | Built: input validation, place resolution and its cache, Forecast and Marine ingest, the four scorers, ordering, named errors | [activity-ranking.md](docs/design/activity-ranking.md) |
| Refresh | Designed: freshness window, `stale`, background refresh, de-duplication | [refresh.md](docs/design/refresh.md) |
| Resilience | Designed: timeouts and retries; stored data served, marked outdated, when Open-Meteo is down. Today an Open-Meteo failure on a request that needs it answers `UPSTREAM_UNAVAILABLE` | [resilience.md](docs/design/resilience.md) |
| Operations | Designed: query depth and cost limits, rate limiting, readiness, graceful shutdown, structured logs. Today the API has GraphQL Yoga's `/health` only | [operations.md](docs/design/operations.md) |

The libraries the designed features use (pg-boss, GraphQL Armor, the rate limiter, pino) are
already declared in `package.json`.

Known limits of what is built, with their mitigations, are in the design's
[risks](docs/design/activity-ranking.md#risks-and-open-questions): the top geocoding match can be
the wrong place; a city is one point, so snow depth is at the model grid's elevation rather than a
resort's; a place on the coast can fall outside Marine's grid.

## How it is built

- **A modular monolith** with layered modules: `graphql → ranking ← {locations, weather}`,
  `ranking → scoring`, where `scoring` is pure functions and `ranking` reaches I/O only through
  ports ([architecture](docs/architecture/)).
- **Tests at three levels**, against a real Postgres in Testcontainers: unit tests for the scorers
  and other pure code, integration tests for ingest and the forecast repository, and end-to-end
  scenarios through the GraphQL endpoint. Only Open-Meteo and the clock are replaced, Open-Meteo by
  a fake that replays recorded answers; nothing of ours is mocked ([testing](docs/testing.md)).
- **A planned, reviewed flow:** requirements, a design doc per feature, one issue and one pull
  request per step, and CI running the same gate as the pre-push hook
  ([workflow](docs/workflow-lifecycle.md), [board](https://github.com/users/vlgriga/projects/2)).

## Documentation

| Doc | Contents |
|---|---|
| [Task](TASK.md) | Original brief |
| [Product requirements](docs/prd.md) | Problem, users, requirements, assumptions, out of scope, success criteria, open questions |
| [Architecture](docs/architecture/) | Principles, modules, ports, bootstrap, runtime, configuration, errors, logging |
| [Feature designs](docs/design/) | How each feature is built: design, alternatives, testing, risks |
| [Decisions](docs/decisions/) | Key decisions and the alternatives rejected |
| [Getting started](docs/getting-started.md) | Prerequisites, setup, checks, schema changes, configuration |
| [Workflow](docs/workflow-lifecycle.md) | Planning, issues, board, flow targets, review, CI, definition of done |
| [Git flow](docs/git-flow.md) | Branches, commits, pull requests, squash merges |
| [Style guide](docs/styleguide.md) | TypeScript, architecture, GraphQL and database conventions |
| [Logging](docs/architecture/logging.md) | Sinks, library bridging, levels and logging rules |
| [Testing](docs/testing.md) | Principles, test levels, fakes, test data, TDD, layout |
| [Review](docs/review.md) | Review depths, roles and the documents each role checks against |
