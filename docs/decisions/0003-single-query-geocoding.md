# 0003. Single query using the top geocoding match
- Status: Accepted
- Date: 2026-10-18

## Context
Input is a free-text city or town. Names are ambiguous ("Springfield", "Paris" in France vs Texas). Open-Meteo Geocoding returns candidates ordered by relevance/population.

## Decision
Expose a single query `activityRanking(city, countryCode?)`. Use the top geocoding match (filtered by `countryCode` when provided) and **return the resolved location** in the response. Cache resolutions in `location_aliases`.

## Consequences
- Simple API for the common case.
- Ambiguous names may silently resolve to the wrong place; mitigated by `countryCode` and by making the resolved location visible so clients can detect and correct it.

## Alternatives considered
- **Two-step `searchLocations(name)` → `activityRanking(locationId)`** — removes ambiguity at the cost of an extra round trip. The natural follow-up if ambiguity proves to matter.
- **Accept lat/lon** — useful for map clients; out of scope for now.
