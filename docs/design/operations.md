# Operations

> Status: draft, to be confirmed in planning ([#13](https://github.com/vlgriga/collinson-group/issues/13)) ·
> Related: [Requirements](../prd.md) · [Architecture](../architecture/) · [Runtime](../architecture/runtime.md)

## Context

The service has to be safe to expose and easy to run: abusive queries refused, its health visible
to whatever runs it, and no work lost on a restart. Requirements: N3–N5.

## Goals and non-goals

- **Goals:** query depth and cost limits, per-client rate limiting, liveness and readiness
  endpoints, graceful shutdown, logs that follow a request or a job end to end.
- **Non-goals:** authentication, multi-region deployment ([PRD](../prd.md#out-of-scope)).

## Design

- **Limits.** Query depth and cost limits, and per-IP rate limiting, on the API.
- **Health.** `GET /health` answers while the process is alive; `GET /ready` while the database is
  reachable.
- **Shutdown.** On SIGTERM, both processes stop taking work, finish what is in flight, and close
  their resources ([bootstrap](../architecture/bootstrap.md)).
- **Logs.** Each request carries a `requestId` and each job a `jobId` through every line it logs
  ([logging](../architecture/logging.md)).

## Alternatives considered

None recorded yet; settled in planning.

## Testing

- **End to end:** `/health` and `/ready`; a query over the depth or cost limit is refused; a client
  over the rate limit is refused.

## Risks and open questions

- Is a public, unauthenticated API acceptable (PRD open question 6)? It decides how strict the
  limits must be.
