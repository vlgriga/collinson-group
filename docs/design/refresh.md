# Refresh

> Status: draft, to be confirmed in planning ([#11](https://github.com/vlgriga/collinson-group/issues/11)) ·
> Related: [Requirements](../prd.md) · [Architecture](../architecture/) · [Activity ranking](activity-ranking.md)

## Context

Stored forecasts go out of date. Requests should stay fast, the answer should say when its data is
old, and the places people ask about should be refreshed without a call to Open-Meteo per request.
Requirements: R9–R11, N2.

## Goals and non-goals

- **Goals:** a freshness window; outdated data served and flagged while a refresh runs; background
  refresh of recently requested places; one fetch for simultaneous first requests.
- **Non-goals:** behaviour when Open-Meteo is down ([resilience](resilience.md)).

## Design

- **Freshness.** Data is fresh while the latest successful `forecast_fetches` row for the
  location is younger than the TTL (3 h by default).
- **Stale while revalidate.** A request that finds stale data answers with it, `stale: true`, and
  enqueues a refresh.
- **One fetch per place.** The `fetch-forecast` job carries a singleton key per location, used by
  the cold-miss path and by the refresh alike, so simultaneous requests cause one fetch.
- **Background refresh.** An hourly cron job selects locations requested in the last 7 days whose
  data is stale, and enqueues `fetch-forecast` for each, rate-limited and retried with backoff.
  Locations nobody asks about stop being refreshed.
- **Retention.** A job prunes raw payloads in `forecast_fetches` after N days.

## Alternatives considered

| Choice | Trade-off | Rejected |
|---|---|---|
| **Hybrid refresh** ([ADR 0002](../decisions/0002-hybrid-refresh-strategy.md)): inline on a cold miss, cron for active places, stale-while-revalidate | Fast reads, bounded upstream calls; the first request for a new city pays ~1–2 s; the 7-day active window is a heuristic | A lazy TTL only (every expiry costs a slow request); a fixed scheduled list (cannot serve arbitrary towns) |
| **pg-boss on Postgres** ([ADR 0001](../decisions/0001-monolith-postgres-pg-boss.md)) | One piece of infrastructure; Postgres carries the queue load, fine at this scale | Redis and BullMQ from day one |

## Testing

- **Integration:** the cron's selection enqueues jobs only for active and stale locations; a
  failed job is retried.
- **End to end:** stale data is answered with `stale: true` and a refresh job is enqueued; two
  simultaneous cold misses for the same city cause one upstream fetch.

## Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| Postgres as both store and queue | Contention at high scale | Fine for this scope; move the queue to Redis if needed |
| The TTL and the active window are guesses | Too many or too few refreshes | Both are configuration; PRD open question 5 decides them |
