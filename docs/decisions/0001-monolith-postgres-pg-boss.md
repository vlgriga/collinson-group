# 0001. Modular monolith on Postgres with pg-boss
- Status: Accepted
- Date: 2026-10-18

## Context
The service needs an API, persistent weather storage and background refresh jobs. Expected load is modest (an exercise, potentially a small internal service). Operational simplicity and reviewability matter more than horizontal scale.

## Decision
One TypeScript codebase with two entrypoints — `api` and `worker` — sharing a single **Postgres** instance for both domain data and the job queue via **pg-boss** (cron schedules, retries, singleton keys for de-duplication).

## Consequences
- One piece of infrastructure to run, back up and monitor; `docker compose up` brings up everything.
- Postgres carries queue load as well as data; acceptable at this scale.
- `api` and `worker` scale independently (separate containers) while sharing modules.
- **Improvement path:** add a cache layer (Redis or in-process LRU) for alias lookups and computed rankings; move the queue to BullMQ/Redis if job volume grows; split into services only if team/scale demands it.

## Alternatives considered
- **API + worker + Redis/BullMQ + Postgres** — industry-standard, scales further, but adds a service with no benefit at current load.
- **Single process with in-memory timers (node-cron)** — simplest, but no retries, no de-duplication across instances, and jobs die with the process.
