# Resilience

> Status: draft, to be confirmed in planning ([#12](https://github.com/vlgriga/collinson-group/issues/12)) ·
> Related: [Requirements](../prd.md) · [Architecture](../architecture/) · [Error handling](../architecture/error-handling.md)

## Context

Open-Meteo is a free service outside our control. An outage on its side should not be an outage on
ours while stored data exists, and every failure the client sees should be named. Requirements:
R8 for "data temporarily missing", R12, N2. R13 is met by [activity ranking](activity-ranking.md); here
it narrows to "nothing stored".

## Goals and non-goals

- **Goals:** bounded, retried upstream calls; stored data served when Open-Meteo is down; a partial
  failure kept apart from "not possible here"; named failures.
- **Non-goals:** refreshing data in the background ([refresh](refresh.md)).

## Design

- **Upstream calls.** A 5 s timeout, 3 retries with exponential backoff and jitter on 5xx, 429 and
  network errors; no retry on 4xx. Every attempt is recorded in `forecast_fetches`.
- **Partial failure.** If Marine fails and Forecast succeeds, surfing is unavailable with "marine
  data temporarily unavailable", distinct from "No marine forecast here". `has_marine` is set
  only on a confirmed empty response.
- **Upstream down.** Stored data is served with `stale: true`; `UPSTREAM_UNAVAILABLE` only when
  nothing is stored.
- **Worker.** pg-boss retries a failed job; one that keeps failing is logged and tried again on the
  next cron tick, without blocking other locations.

## Alternatives considered

None recorded yet; settled in planning.

## Testing

- **Integration:** the Open-Meteo clients retry on 5xx, 429 and network errors, not on 4xx; a
  timeout; a response that fails validation; a marine failure leaves `has_marine` unchanged.
- **End to end:** Open-Meteo down with data stored (outdated answer) and without
  (`UPSTREAM_UNAVAILABLE`).

## Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| Open-Meteo free-tier limits and non-commercial terms | Throttling, or a licensing issue in production | De-duplication, the active-window refresh, backoff on 429; a commercial plan for production |
