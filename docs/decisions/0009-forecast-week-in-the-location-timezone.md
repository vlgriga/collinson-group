# 0009. Forecast week as explicit dates in the location's timezone
- Status: Accepted
- Date: 2026-10-20
- Supersedes: the `timezone=auto` clause of [0005](0005-daily-granularity-upsert.md)

## Context
A request's days start at "today" in the place's timezone, computed from the injected clock and the geocoder's timezone. With `timezone=auto` and `forecast_days=7`, Open-Meteo picks the timezone from its own grid and "today" from its own clock. The stored dates can then start a day before or after ours, near midnight or at a timezone border, and a fetch may not cover the week it was made for.

## Decision
Forecast and Marine are requested with `timezone` set to the location's timezone and `start_date`/`end_date` set to the 7 dates from today in that timezone. A response that does not hold exactly those dates is invalid.

## Consequences
- The stored dates and "today" are the same calendar; a successful fetch always covers its week.
- A provider that cannot answer for today yet, just after midnight, fails the fetch instead of returning a short week.
- The test fake answers for the dates it is asked for, rather than rebasing its fixtures to the clock.

## Alternatives considered
- **`timezone=auto` with `forecast_days=7`** — no dates to compute, but our "today" and the provider's can differ, and a short week makes every request re-fetch.
- **Taking "today" from the timezone in the forecast response** — matches the provider, but the location's timezone is then two values that can disagree.
