# Activity Forecast Service

A GraphQL backend (Node.js, TypeScript) that takes a city or town and ranks how good each of the next 7 days will be for **skiing, surfing, outdoor sightseeing and indoor sightseeing**, based on [Open-Meteo](https://open-meteo.com/) weather data that is persisted in Postgres and refreshed in the background.

> Status: tooling and product requirements are in place; the service is built feature by feature from the issues on the [board](https://github.com/users/vlgriga/projects/2).

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

## Quick start

_Works once the service code lands; until then there is nothing to build:_

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
