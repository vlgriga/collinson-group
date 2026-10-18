# 0002. Hybrid refresh strategy
- Status: Accepted
- Date: 2026-10-18

## Context
Weather data must be persisted rather than fetched per request. Users can ask for any town, so the set of locations is open-ended. Open-Meteo models update every few hours, and the free tier should be used politely.

## Decision
- **Cold miss** (never-seen location): fetch inline, persist, return. A pg-boss singleton key per location de-duplicates concurrent fetches.
- **Fresh** (latest successful fetch < TTL, default 3 h): serve from Postgres.
- **Stale**: serve stored data with `stale: true` and enqueue a refresh (stale-while-revalidate).
- **Cron (hourly)**: refresh locations requested in the last 7 days whose data is older than the TTL.

## Consequences
- Reads are almost always served from the database; only the first request for a new city pays upstream latency (~1–2 s).
- Upstream calls are bounded by the number of *active* locations, not request volume.
- Locations nobody asks about age out of the refresh set automatically.
- TTL and active window are heuristics exposed as configuration.

## Alternatives considered
- **Lazy read-through only** — no worker, but every TTL expiry makes some user wait for upstream.
- **Scheduled refresh of a fixed city list** — predictable load, but cannot serve arbitrary towns.
