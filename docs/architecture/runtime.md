# Runtime

> Related: [Architecture](README.md) · [Bootstrap](bootstrap.md) · [ADR 0001](../decisions/0001-monolith-postgres-pg-boss.md)

| Part | Does | Talks to |
|---|---|---|
| `api` | Answers GraphQL requests over HTTP; may enqueue background work | Postgres, Open-Meteo |
| `worker` | Runs the background jobs, including the scheduled ones | Postgres, Open-Meteo |
| Postgres | Holds the data, and the job queue in its own schema | — |

- The two processes share no memory. Everything they share goes through Postgres: the data, and
  the jobs one enqueues and the other runs.
- Either process can run as several instances; the queue gives each job to one of them.
- A job is idempotent: running it twice leaves the same state as running it once.
- Locally, `docker compose` runs the parts that exist, plus a one-shot service that applies the
  migrations before the processes start: `api` and Postgres until [Refresh](../design/refresh.md)
  builds the `worker`.
