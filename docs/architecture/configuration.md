# Configuration

> Related: [Architecture](README.md) · [Bootstrap](bootstrap.md) · [Getting started](../getting-started.md#where-the-configuration-lives)

- **Where it comes from.** Everything the service reads comes from environment variables.
  `.env.example` lists every one of them, with a value that works locally.
- **Who validates it.** `src/config/env.ts` validates the environment with zod at startup. A
  missing or invalid value stops the process before it serves anything.
- **Who sees it.** The composition roots read the configuration and pass each part to what needs
  it. No module reads the environment itself.
- **Tuning that is not deployment.** Values that shape behaviour rather than deployment, such as
  scoring thresholds, are typed configuration in `src/config/`, each with the reason for its
  value next to it.
