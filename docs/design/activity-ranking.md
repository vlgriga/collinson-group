# Activity ranking

> Status: draft, to be confirmed in planning ([#10](https://github.com/vlgriga/collinson-group/issues/10)) ·
> Related: [Requirements](../prd.md) · [Architecture](../architecture/)

## Context

A client sends the name of a city and gets, for each of the four activities, how good each of the
next days is, a weekly score and the best day, ordered best first. Requirements: R1–R9, N1, N7.

## Goals and non-goals

- **Goals:** resolve a name to one place; fetch and store its forecast; score every day for every
  activity; answer from stored data.
- **Non-goals:** keeping the data fresh in the background ([refresh](refresh.md)), surviving
  Open-Meteo outages ([resilience](resilience.md)), limits and operability
  ([operations](operations.md)).

## Design

### Request flow

1. **Resolve the place.** Normalise the input, look it up in `location_aliases`; on a miss, call
   Open-Meteo Geocoding, take the **top match** (filtered by `countryCode` when given), and store
   the location and the alias.
2. **Load the forecast** of the location from Postgres. If none is stored, fetch it inline, store
   it, and go on.
3. **Score** every day for every activity, aggregate, sort, and answer.
4. **Mark the location as requested** (`locations.last_requested_at`).

### Open-Meteo calls

| API | Endpoint | Key parameters |
|---|---|---|
| Geocoding | `geocoding-api.open-meteo.com/v1/search` | `name`, `count=10`, `countryCode` |
| Forecast | `api.open-meteo.com/v1/forecast` | `daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,rain_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration,daylight_duration,weather_code,uv_index_max`, `hourly=snow_depth`, `forecast_days=7`, `timezone=auto` |
| Marine | `marine-api.open-meteo.com/v1/marine` | `daily=wave_height_max,wave_period_max,wave_direction_dominant,swell_wave_height_max,swell_wave_period_max,wind_wave_height_max`, `forecast_days=7`, `timezone=auto` |

Units are converted at ingest; hourly snow depth is reduced to its daily maximum.

### Data model

| Table | Key | Contents |
|---|---|---|
| `locations` | `id` uuid; unique `geocoding_id` | name, country, country_code, admin1, latitude, longitude, elevation, timezone, `has_marine` (null = unknown), `last_requested_at` |
| `location_aliases` | (`normalized_query`, `country_code`) | → `location_id` (the geocoding cache) |
| `daily_weather` | (`location_id`, `date`) | temp min/max, apparent temp max, precipitation sum and probability, rain, snowfall, snow depth (daily max of hourly), wind speed and gusts max, sunshine and daylight duration, weather code, UV index |
| `daily_marine` | (`location_id`, `date`) | wave height/period/direction, swell height/period, wind-wave height |
| `forecast_fetches` | `id` | location, source (`FORECAST`/`MARINE`), `fetched_at`, status, error, `raw_payload` jsonb |

- Daily rows are **upserted** per fetch ([ADR 0005](../decisions/0005-daily-granularity-upsert.md)).
- Raw payloads allow re-processing if extracted columns change, and help debugging.
- Scores are **not stored**: they are computed on read from the daily rows
  ([ADR 0004](../decisions/0004-compute-scores-on-read.md)).

### API

```graphql
scalar Date
scalar DateTime

type Query {
  activityRanking(city: String!, countryCode: String, days: Int = 7): ActivityRanking!
}

type ActivityRanking {
  location: Location!               # what the city resolved to
  forecastFetchedAt: DateTime!
  stale: Boolean!
  activities: [ActivityForecast!]!  # available by score desc, unavailable last
}

type ActivityForecast {
  activity: Activity!
  available: Boolean!
  unavailableReason: String
  score: Int                        # 0–100 weekly aggregate; null if unavailable
  bestDay: Date
  days: [DayScore!]!
}

type DayScore {
  date: Date!
  score: Int!
  rating: Rating!
  reasons: [String!]!
}

type Location {
  name: String!
  country: String!
  countryCode: String!
  admin1: String
  latitude: Float!
  longitude: Float!
  elevation: Float
  timezone: String!
}

enum Activity { SKIING SURFING OUTDOOR_SIGHTSEEING INDOOR_SIGHTSEEING }
enum Rating { POOR FAIR GOOD EXCELLENT }
```

Errors: `BAD_USER_INPUT` (city 1–100 characters, days 1–7, ISO-2 country), `LOCATION_NOT_FOUND`.

### Scoring

Each factor maps to a 0–1 sub-score through piecewise-linear "comfort band" curves; sub-scores are
combined as a weighted sum, then **hard caps** apply for dangerous or pointless conditions. Reasons
come from the 2–3 most influential factors. Ratings: < 40 POOR, 40–59 FAIR, 60–79 GOOD,
≥ 80 EXCELLENT. Weekly score = mean of the daily scores; `bestDay` = the argmax.

| Activity | Factors (weight) | Hard caps | Unavailable when |
|---|---|---|---|
| Skiing | snow depth (0.4), fresh snowfall (0.2), temperature (0.15), wind/gusts (0.15), sunshine (0.1) | gusts > 60 km/h; no snow on ground | never (scores low) |
| Surfing | wave height (0.35), swell period (0.3), wind speed (0.25), air temp (0.1) | waves > 4 m; thunderstorm | no marine data |
| Outdoor sightseeing | precipitation (0.35), apparent temp (0.25), sunshine fraction (0.2), wind (0.1), UV (0.1) | thunderstorm, heavy rain/snow | never |
| Indoor sightseeing | baseline 50, rises as outdoor conditions worsen | none | never |

## Alternatives considered

| Choice | Trade-off | Rejected |
|---|---|---|
| **One query, top geocoding match** ([ADR 0003](../decisions/0003-single-query-geocoding.md)) | Simple API, but ambiguous names may resolve to the wrong place; mitigated by `countryCode` and by returning the resolved location | `searchLocations` + `activityRanking(locationId)`, the natural next step if ambiguity matters in practice |
| **Scores computed on read** | Tiny CPU cost per request; scoring changes need no backfill | Score tables precomputed by the worker |
| **Daily granularity** | Simple model and API; loses intra-day nuance | Hourly storage and scoring |
| **Upserting the latest forecast**, with a raw payload log | Simple reads; no history of forecast revisions | Append-only snapshots per fetch |
| **Rule-based heuristics** | Transparent, explainable, testable; not empirically validated | Learned models, for which there is no labelled data |

## Testing

- **Unit:** each scorer table-driven (blizzard day, perfect beach day, heatwave, inland), the
  aggregation, rating thresholds, the hourly → daily reduction, date handling.
- **Integration:** the Open-Meteo clients, ingest and the repositories against real Postgres,
  with the Open-Meteo fake.
- **End to end:** a cold miss, a fresh hit, an inland city, an unknown city, invalid input.

## Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| Geocoding ambiguity | The wrong place is ranked | `countryCode`, the resolved location in the response; a search step later |
| Snow depth is modelled at grid-cell elevation, not resort elevation | Ski scores mislead for valley towns near resorts | Document it; later, accept an elevation or resort coordinates |
| Marine coverage near the coastline | Coastal towns marked inland, or the reverse | Null is "unavailable" with an explicit reason; later, a nearest-coast lookup |
| Heuristic scoring is subjective | Rankings disputed | Thresholds in configuration, reasons in the output |
