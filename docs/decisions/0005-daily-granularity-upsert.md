# 0005. Daily granularity, upserted forecasts + raw payload log
- Status: Accepted
- Date: 2026-10-18

## Context
Rankings are per day. Open-Meteo provides daily aggregates for most variables; snow depth is hourly only. Each refresh returns a new 7-day forecast overlapping the previous one.

## Decision
- Store one row per `(location_id, date)` in `daily_weather` and `daily_marine`; reduce hourly snow depth to a daily max at ingest.
- **Upsert** rows on every fetch; freshness is the latest successful row in `forecast_fetches`.
- Keep each raw upstream payload in `forecast_fetches.raw_payload` (jsonb), pruned after N days.
- Dates are local to the location (`timezone=auto`).

## Consequences
- Simple model and queries; small storage footprint.
- No history of forecast revisions (can't answer "how did the forecast for Saturday change?").
- Intra-day nuance is lost (morning surf window, afternoon storms).
- Raw payloads allow re-extraction if columns change.

## Alternatives considered
- **Hourly storage and scoring** — richer ("best time window"), more data and API complexity; deferred.
- **Append-only snapshots per fetch** — full history, but reads must pick the latest snapshot and storage grows quickly.
