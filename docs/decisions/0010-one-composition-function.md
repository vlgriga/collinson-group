# 0010. One composition function shared by the entrypoints and the tests
- Status: Accepted
- Date: 2026-10-20
- Refines: the composition roots of [0008](0008-layered-modules-ports-at-seams.md)

## Context
[ADR 0008](0008-layered-modules-ports-at-seams.md) makes `api.ts` and `worker.ts` the only places that construct concrete classes. [Bootstrap](../architecture/bootstrap.md) and [testing](../testing.md#where-a-test-enters) ask for one wiring function, shared by both entrypoints and the test app, so that a test reaches exactly what production wires. Both can't hold to the letter: a function the three of them share lives in neither entrypoint.

## Decision
The wiring is **`createApp` in `src/app.ts`**. It and the two entrypoints are the composition roots, and concrete classes are constructed only there. An entrypoint reads the environment, calls `createApp` and starts its process. The test app calls `createApp` with the fakes and test configuration.

## Consequences
- Tests build the wiring production runs, not a copy of it.
- What 0008 is for still holds: no module builds its own dependencies, and `ranking` sees only its ports.
- An entrypoint still constructs what only its own process needs, such as the HTTP server or the job consumers.
- One more file at the root of `src/`, outside every module.

## Alternatives considered
- **Each entrypoint wires itself, and the test app repeats the wiring** — the rule stays literal, but the test app drifts from production with every adapter added to one side and not the other.
- **The wiring in a module, e.g. `shared/`** — that module would import every other module and break the layering of 0008.
