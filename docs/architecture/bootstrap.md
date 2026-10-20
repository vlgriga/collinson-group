# Bootstrap

> Related: [Architecture](README.md) · [Ports](ports.md) · [Runtime](runtime.md)

## Composition roots

`src/api.ts` and `src/worker.ts` are the only places concrete classes are constructed and bound to
the ports. Each one:

1. reads and validates the [configuration](configuration.md), and exits if it is invalid;
2. builds the root logger, the database client and the job queue;
3. builds the adapters and passes them to the services that need them;
4. starts its process — the HTTP server or the job consumers;
5. on shutdown, stops taking work, finishes what is in flight, closes the queue and the database,
   and closes the logger last so that nothing logged is lost.

## One composition, three users

The wiring is one function, `createApp` in `src/app.ts`, shared by `api.ts`, `worker.ts` and the test
app (`createTestApp`). The test app differs only in what it passes in: the Open-Meteo fake, a fixed
clock, and configuration for tests. A module the composition does not wire is a module no test
reaches.

## Rules

- Dependencies are passed explicitly, through constructors or function parameters. There are no
  hidden singletons and no module that builds its own dependencies.
- Nothing outside the composition roots reads the environment.
