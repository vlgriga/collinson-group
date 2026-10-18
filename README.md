# Activity Forecast Service

A GraphQL backend (Node.js, TypeScript) that takes a city or town and ranks how good each of the next 7 days will be for **skiing, surfing, outdoor sightseeing and indoor sightseeing**, based on [Open-Meteo](https://open-meteo.com/) weather data that is persisted in Postgres and refreshed in the background.

> Status: design complete, implementation in progress — see the [implementation plan](docs/implementation-plan.md).

## Documentation

| Doc | Contents |
|---|---|
| [Task](TASK.md) | Original brief |
| [Product requirements](docs/prd.md) | Problem, users, requirements, assumptions, out of scope, success criteria, open questions |
| [Architecture](docs/architecture.md) | Components, data model, API, scoring, trade-offs, risks |
| [Decisions](docs/decisions/) | Key decisions and the alternatives rejected |
| [Getting started](docs/getting-started.md) | Prerequisites, setup, checks, schema changes, configuration |
| [Workflow](docs/workflow-lifecycle.md) | Issues, board, flow targets, review, CI, definition of done |
| [Git flow](docs/git-flow.md) | Branches, commits, pull requests, squash merges |
| [Style guide](docs/styleguide.md) | TypeScript, architecture, GraphQL and database conventions |
| [Logging](docs/logging.md) | Sinks, library bridging, levels and logging rules |
| [Testing](docs/testing.md) | Principles, test levels, fakes, test data, TDD, layout |
| [Review](docs/review.md) | Review depths, roles and the documents each role checks against |
| [Implementation plan](docs/implementation-plan.md) | Ordered milestones |

## Quick start

_Available once milestone M8 is complete:_

```bash
docker compose up --build
```

```graphql
query {
  activityRanking(city: "Chamonix") {
    location { name country latitude longitude }
    stale
    activities {
      activity
      score
      bestDay
      days { date score rating reasons }
    }
  }
}
```
