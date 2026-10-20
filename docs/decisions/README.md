# Architecture Decision Records

Short records of significant decisions: context, decision, consequences, alternatives. One file per decision, numbered, never rewritten — a reversed decision gets a new ADR that supersedes the old one.

| # | Decision | Status |
|---|---|---|
| [0001](0001-monolith-postgres-pg-boss.md) | Modular monolith on Postgres with pg-boss | Accepted |
| [0002](0002-hybrid-refresh-strategy.md) | Hybrid refresh: inline on cold miss + cron + stale-while-revalidate | Accepted |
| [0003](0003-single-query-geocoding.md) | Single query using the top geocoding match | Accepted |
| [0004](0004-compute-scores-on-read.md) | Compute scores on read, don't persist them | Accepted |
| [0005](0005-daily-granularity-upsert.md) | Daily granularity, upserted forecasts + raw payload log | Accepted; `timezone=auto` superseded by 0009 |
| [0006](0006-drizzle-orm.md) | Drizzle ORM for data access | Accepted |
| [0007](0007-graphql-yoga-schema-first.md) | GraphQL Yoga, schema-first with codegen | Accepted |
| [0008](0008-layered-modules-ports-at-seams.md) | Layered feature modules with ports at the I/O seams | Accepted; composition roots refined by 0010 |
| [0009](0009-forecast-week-in-the-location-timezone.md) | Forecast week as explicit dates in the location's timezone | Accepted |
| [0010](0010-one-composition-function.md) | One composition function shared by the entrypoints and the tests | Accepted |

Template:

```markdown
# NNNN. Title
- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
## Alternatives considered
```
