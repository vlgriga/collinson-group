# Logging

> Related: [Architecture](architecture.md) · [Style guide](styleguide.md#logging) · [Getting started](getting-started.md#where-the-configuration-lives)

## The problem

Two different readers read a log, and they need opposite things. A person at a terminal wants a
short line, with nested values unfolded. A collector wants every value as a field it can query. A
log built for one of them is useless to the other.

There is a second, quieter problem: the libraries don't log the way the application does. Node has
no standard logging module for them to share. Yoga has its own logger, Drizzle prints queries
through its own, and pg-boss and the `pg` pool report trouble as events that nobody hears unless
someone listens. Left alone, the output becomes a mix of formats and silences, and the interesting
line is the hardest one to see.

## The decision

**Three sinks, all running at once.** We don't pick one of them; each process writes to all three:

| Sink | Format | Purpose |
|---|---|---|
| Terminal (stdout) | `pino-pretty`: one short line, fields unfolded below it | A person reading as it happens |
| File | One JSON object per line | Reading back a given day; survives the terminal |
| Structured (OTLP) | One field per value | A collector: Grafana, Datadog, anything that speaks OpenTelemetry |

Each sink has its own level, and each can be set to `off` on its own. Production usually wants all
three. Locally, the terminal is enough. The sinks are pino transports, so formatting and I/O run in
a worker thread, off the request path.

**Everything arrives by one path.** There is one root pino logger, built in `src/shared/logging/`.
Every library that can log is given a child of it, and every library that reports through events is
listened to and bridged into it:

| Library | How it is bridged |
|---|---|
| GraphQL Yoga | `createYoga({ logging })` receives a child logger |
| Drizzle | `logger` option forwards queries at `debug` |
| pg-boss | `error` and the other events it emits are logged |
| `pg` pool | the `error` event is logged |
| Open-Meteo calls | the shared HTTP helper logs each attempt; `fetch` itself logs nothing |
| The process | `uncaughtException` and `unhandledRejection` are logged at `fatal` before exit |

A library line is then laid out by the same builder as the application's own, so it no longer
stands out. Each child carries a `component` field (`yoga`, `drizzle`, `pg-boss`, `pg`,
`open-meteo`), shown beside the module, so it is still clear where a line came from.

**Values are passed as values, not formatted into the message.** The message is a constant string,
and the values become fields of the record:

```ts
logger.info({ locationId, source: 'MARINE', durationMs }, 'forecast fetched');
```

The terminal lays the fields out for reading. The file writes them on the same JSON line, so one
record stays one line. The structured sink sends each one as an attribute of its own. The same call
serves all three. Context that belongs to a whole unit of work is bound once, in a child logger:
`requestId` per GraphQL request, `jobId` and `jobName` per pg-boss job.

**Files are kept like a library, not a heap.** There is one file per day inside a directory per
month (`logs/2026-10/2026-10-18.log`). Each file is closed at midnight UTC, gzipped once closed, and
kept for `LOG_FILE_RETENTION_DAYS`. To find what was happening on a given day, you open that day's
file. `api` and `worker` write to separate files (`logs/2026-10/2026-10-18.api.log`), so two
processes never share one file.

## The cost

Bridging is per library, not global. Node has no root handler to intercept, so a new dependency
that logs on its own is invisible, or printed raw, until someone wires it in. Adding a dependency
that logs therefore includes adding its bridge.

Transports run in a worker thread. A process that dies abruptly can lose the last records it
buffered. Graceful shutdown closes the logger last and waits for it to flush. A hard crash is only
as good as the `fatal` handler that runs before exit.

In a container, the file sink writes into the container's filesystem. It is only worth anything
when `LOG_FILE_DIR` is a mounted volume, and `docker-compose.yml` mounts `./logs` for that reason.

## Configuration

All configuration is validated in `src/config/env.ts` like the rest.

| Variable | Default | Meaning |
|---|---|---|
| `LOG_TERMINAL_LEVEL` | `info` | `trace` … `fatal`, or `off` |
| `LOG_FILE_LEVEL` | `info` | Same; `off` disables the file sink |
| `LOG_FILE_DIR` | `./logs` | Root of the `YYYY-MM/` directories |
| `LOG_FILE_RETENTION_DAYS` | `30` | Closed files older than this are deleted |
| `LOG_OTLP_LEVEL` | `off` | Same; needs `OTEL_EXPORTER_OTLP_ENDPOINT` |

## Rules

- `console.*` is not used; everything goes through the logger. ESLint's `no-console` enforces it.
- Errors are logged under the `err` key (`logger.error({ err }, '…')`), so pino's serializer keeps
  the stack and `cause`. An error is never stringified into the message.
- Secrets and personal data stay out of the log. pino `redact` removes `authorization`, `cookie`
  and `DATABASE_URL`. Raw Open-Meteo payloads and full GraphQL variables are never logged; the
  payloads live in `forecast_fetches.raw_payload`. Drizzle query parameters are logged only at
  `debug`, which is a development setting.
- A failure the caller is told about is logged at the level its cause deserves. A fault on the
  client's side (`BAD_USER_INPUT`, `LOCATION_NOT_FOUND`) is a `warn`. A fault on the service's side
  (`UPSTREAM_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`) is an `error`. Stale data served because
  Open-Meteo is down is a `warn`: the client still got an answer.
- A failure is logged once, where it is handled: in the GraphQL error mapper, a job handler, or the
  fallback that serves stale data. Services throw and don't log. A function that logs and then
  rethrows puts the same failure in the log twice and hides how often it really happens. pg-boss
  retries are the one deliberate exception: each failed attempt is a `warn` with its attempt
  number, and only the final failure is an `error`.
