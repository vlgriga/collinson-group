# Product requirements

> Related: [Task](../TASK.md) · [Architecture](architecture.md) · [Decisions](decisions/)

What the service must do and why. How it does it is in [architecture](architecture.md) and the
[decision records](decisions/); nothing here chooses a technology the brief does not.

## Problem

Someone deciding what to do in a place over the coming week has to read a weather forecast and
judge, activity by activity, which days are any good. The forecast answers "what will the weather
be", not "is Thursday a good day to ski". The service answers the second question for four
activities — skiing, surfing, outdoor sightseeing and indoor sightseeing — for any city or town.

## Users

The consumer is an API client: a web or mobile front end, or another service, acting for a person
who is choosing a day or an activity. Who that client is exactly is an
[open question](#open-questions); the requirements below hold for any of them.

## User stories

1. As a client, I send the name of a city or town and get, for each activity, how good each of the
   next 7 days is, so that I can pick a day.
2. As a client, I get a weekly score and the best day per activity, and the activities ordered best
   first, so that I can pick an activity without comparing every day myself.
3. As a client, I get a short reason for each day's score, so that I can show the person why a day
   is good or bad.
4. As a client, I see which place the name was taken to mean, and I can narrow the name by country,
   so that I can notice and avoid a wrong match ("Paris", Texas).
5. As a client, I am told when an activity is not possible in a place at all — surfing far from the
   sea — rather than given a low score that looks like bad weather.
6. As a client, I still get an answer when the weather provider is down, marked as outdated, so that
   an outage on their side is not an outage on mine.
7. As the operator, I keep the data fresh for the places people ask about without calling the
   weather provider on every request, so that the service stays fast and within the provider's
   free-tier terms.

## Functional requirements

| ID | Requirement |
|---|---|
| R1 | A request names a city or town (1–100 characters), and may add an ISO 3166-1 alpha-2 country code and a number of days from 1 to 7 (default 7). |
| R2 | The name resolves to one place. A country code limits the match to that country. The response states the place it resolved to: name, country, region, coordinates, elevation and timezone. |
| R3 | The days are today and the days after it, in the place's local timezone. |
| R4 | Every response covers the four activities: skiing, surfing, outdoor sightseeing, indoor sightseeing. |
| R5 | Each activity gets, for each day, a score from 0 to 100, a rating (poor, fair, good, excellent) and the reasons behind the score. |
| R6 | Each activity gets a weekly score over the requested days and its best day. |
| R7 | Activities are ordered by weekly score, best first; unavailable activities come last. |
| R8 | An activity the place cannot support is marked unavailable, with a reason. "Not possible here" (no sea) and "data temporarily missing" (the sea forecast failed) are different reasons. |
| R9 | Weather data is stored. A request is answered from stored data while it is fresh; the weather provider is not called per request. |
| R10 | The response states when its weather data was fetched and whether it is outdated. |
| R11 | Data for places requested recently is refreshed in the background. A place nobody has asked about for a while stops being refreshed. |
| R12 | When the weather provider is unavailable and data for the place is stored, the stored data is returned, marked outdated. |
| R13 | Failures are distinct and named: invalid input, an unknown place, and the weather provider unavailable with nothing stored. |

## Non-functional requirements

| ID | Requirement |
|---|---|
| N1 | A request answered from stored data typically takes well under 100 ms; the first request for a place never seen before takes about 1–2 s. |
| N2 | Calls to the weather provider are bounded and de-duplicated: simultaneous first requests for the same place cause one fetch. |
| N3 | Oversized queries are refused, and a single client cannot flood the service. |
| N4 | One command runs the whole service locally. It reports liveness and readiness, and shuts down without dropping work in progress. |
| N5 | Every request and background job leaves structured logs that can be followed end to end. |
| N6 | Every change is checked automatically: lint, types and tests. |
| N7 | Scoring rules are readable and can be tuned without migrating stored data. |

## Constraints

From the [brief](../TASK.md):

- Node.js, TypeScript and GraphQL.
- Open-Meteo is the weather source; its free, non-commercial API.
- Weather data is persisted rather than fetched per request. Storage is free to choose.

## Assumptions

- "The next 7 days" are today and the six days after it, in the place's local timezone.
- A day is the unit of ranking; there is no hourly best window.
- A city is one point, the geocoder's coordinates. No nearby resort or beach is searched for.
- Open-Meteo's free, non-commercial terms are acceptable for this exercise.
- Scoring is a heuristic, not a validated model; its thresholds are configuration.

## Out of scope

Authentication, multi-region deployment, user preferences and personalised scoring, hourly
best-time windows, surf scoring that accounts for wind direction against the coastline, searching
for the nearest resort or beach, historical analytics, a front end.

## Success criteria

- From a clean clone, one command starts the service, and a query for a known city returns the four
  activities ranked over 7 days.
- A second query for the same city within the freshness window does not call the weather provider.
- An inland city gets surfing marked unavailable, with its reason.
- With the weather provider down, a stored city is answered with outdated data, and a city never
  stored gets a named failure.
- Every requirement above has at least one automated test that names it.

## Open questions

1. Who consumes the API — a web or mobile app, an internal service? It decides whether a location
   search step, pagination or subscriptions are worth adding.
2. Should near days weigh more in the weekly score, since a forecast grows less certain with lead
   time?
3. What does "indoor sightseeing" mean to the business: independent of the weather, or best when
   outdoor conditions are bad (the current reading)?
4. Should skiing and surfing look beyond the city point, to the nearest resort or beach within some
   distance?
5. How much traffic, and how many distinct places, are expected? It drives the freshness window,
   the refresh window and caching.
6. Is a public, unauthenticated API acceptable, or is an API key needed?
7. Which units and locale do the reasons use — metric or imperial, which languages?
