# Ports

> Related: [Architecture](README.md) · [Modules](modules.md) · [Bootstrap](bootstrap.md)

The core says what it needs; the edges provide it. `ranking/ports.ts` declares the interfaces the
use case depends on, and each is implemented by an adapter in another module:

| Port | What it does | Implemented in |
|---|---|---|
| `LocationResolver` | Turns a name and an optional country into a place | `locations` |
| `ForecastReader` | Reads the stored days and when they were fetched | `weather` |
| `ForecastFetcher` | Fetches and stores a place's forecast now | `weather` |
| `RefreshScheduler` | Asks for a place to be refreshed in the background | `jobs` |
| `Clock` | Says what time it is | `shared` |

## Rules

- `ranking` never imports the database, the job queue or an HTTP client; it sees only its ports.
- An adapter implements a port and may use anything below it; it holds no business rules.
- A port is declared by the side that needs it, in the terms of that side.
- A new seam is a new port, declared where it is needed, not a direct import across modules.
- Tests replace only what is third-party — Open-Meteo and the clock — and never one of our own
  adapters ([testing.md](../testing.md#isolating-dependencies)).
