# 0004. Compute scores on read
- Status: Accepted
- Date: 2026-10-18

## Context
Activity scores are derived from at most 7 daily rows × 4 activities per request. Scoring rules are heuristic and expected to be tuned.

## Decision
Persist only weather data. Compute scores, ratings and reasons on every request using pure functions in `scoring/`.

## Consequences
- Negligible CPU cost (microseconds per request).
- Changing weights or thresholds takes effect immediately — no backfill, no score versioning.
- Scoring is trivially unit-testable in isolation.
- If ranking queries become hot, cache the computed response (see ADR 0001 improvement path) rather than persisting scores.

## Alternatives considered
- **Worker precomputes `daily_activity_scores`** — fastest possible reads, but optimises a non-bottleneck and requires backfills and versioning on every scoring change.
