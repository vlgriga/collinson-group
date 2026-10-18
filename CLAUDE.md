# CLAUDE.md

Activity Forecast Service: a GraphQL backend (Node 22, TypeScript strict, ESM) that takes a city
and ranks the next 7 days for skiing, surfing, outdoor and indoor sightseeing, from Open-Meteo data
persisted in Postgres and refreshed in the background by a pg-boss worker. The brief is
[TASK.md](TASK.md).

**State:** design is done, code is not started. Work goes milestone by milestone through
[docs/implementation-plan.md](docs/implementation-plan.md). A command or file named below that does
not exist yet belongs to a milestone that hasn't landed: build it as the plan says, don't invent a
substitute.

## Where the rules are

The docs are the source of truth; this file only points at them. Read the one that covers the work
before starting it.

| Before you… | Read |
|---|---|
| decide what a change must do | [prd.md](docs/prd.md) |
| set up the machine, run checks, change the schema or config | [getting-started.md](docs/getting-started.md) |
| pick up an issue, move the board, open or merge a PR | [workflow-lifecycle.md](docs/workflow-lifecycle.md) |
| name a branch, write a commit or a PR title | [git-flow.md](docs/git-flow.md) |
| write any code | [styleguide.md](docs/styleguide.md), [architecture.md](docs/architecture.md) |
| write or change a test | [testing.md](docs/testing.md) |
| log anything | [logging.md](docs/logging.md) |
| review a change | [review.md](docs/review.md) |
| go against a recorded decision | [decisions/](docs/decisions/) |

## How work flows

Issue → TDD question → `make start` → implementation → `make gate` → shallow review → `make pr` →
`make ready` → deep review → `make merge`. Described in
[workflow-lifecycle.md](docs/workflow-lifecycle.md).

## Commands

If a `Makefile` target does the job, use it rather than the command behind it. `make help` lists
every target.

```bash
make help          # every target, one line each
make doctor        # what's missing on this machine, and the command that fixes it
make install       # npm ci + git hooks
make migrate       # Postgres from docker compose + migrations
make dev-api       # http://localhost:4000/graphql
make dev-worker
make check         # lint, format check, typecheck; changes nothing
make fix
make test          # all levels, real Postgres in containers (Docker must be running)
make build         # src/ → dist/
make gate          # check + test + build; must pass before any push
make codegen       # after editing schema.graphql
make migration     # after editing src/db/schema.ts; read the generated SQL

make start ISSUE=<n> [TYPE=bugfix]   # worktree + branch, issue → In Progress
make pr | make ready | make merge | make cleanup
make branch-check [BRANCH=<name>]    # the branch template, as the commit-msg hook runs it
```

One test layer: `npm run test:unit` (no Docker), `test:integration`, `test:e2e`; append `-- <name>`
to narrow.

## Rules that are easy to break

**Architecture**
- Layering: `graphql → ranking ← {locations, weather, jobs}`, `ranking → scoring`,
  `jobs → weather`; anything may import `db`, `shared`, `config`. No cycles.
- Modules import each other only through `index.ts`. Concrete classes are wired only in `api.ts` and
  `worker.ts`.
- `ranking` talks to the outside only through `ranking/ports.ts`. Resolvers are thin.
- `scoring/` is pure: no I/O, no `Date.now()`, no logging.

**Code**
- No `any`, no `enum`, no default exports, no `!` outside tests; relative imports end in `.js`.
- Physical quantities carry their unit in the name (`windSpeedKmh`, `snowDepthCm`); units are
  converted at ingest, never in scorers.
- Calendar days are `LocalDate` strings, never `Date`; "now" comes from the injected `Clock`.
- External data (HTTP, env, GraphQL input) is validated with zod at the boundary.
- Errors are typed domain errors from `shared/errors.ts`; nothing is swallowed.
- Logging: pino only, no `console.*`; the message is a constant string, data and `err` go in fields;
  log a failure once, where it is handled.

**Tests**
- Nothing of ours is mocked; only Open-Meteo and the clock are replaced, by fakes.
- Given / When / Then comments, one *when*, one case per test, no sleeping, no shared state.
- The level is in the suffix: `.unit.test.ts`, `.int.test.ts`, `.e2e.test.ts`, under `test/`
  mirroring `src/`.
- Ask the author once, before any code, whether the issue is done with TDD. With nobody to ask,
  don't assume it. If yes: a scenario list from the acceptance criteria, confirmed by the author,
  then red → green → refactor one scenario at a time ([testing.md](docs/testing.md#tdd)).

**Git**
- Never commit to `main`: every change goes through an issue, a worktree and a PR. The one
  exception is milestone M-1, which builds that tooling and so is done on `main`.
- Branch `<type>/<n>-<slug>`; commit `<type>(<scope>): #<n> <description>`; everything in English.
- A choice made on purpose, where another would have looked just as right, gets a
  `Decision: <choice> — <why>` footer.
- A design deviation becomes an ADR or a follow-up issue, not a comment thread.

**Docs**
- Before adding something new — a helper, a type, an error, a doc section — check what is already
  there.
- Documentation is written in general terms: the substance, the decision and its cost, not a
  retelling of the code.

## How to work

From [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).

1. **Think before coding.** State assumptions; if a request has more than one reading, present
   them instead of picking silently. If something is unclear, name it and ask. If a simpler
   approach exists, say so and push back.
2. **Simplicity first.** The minimum code that solves the problem: no features, abstractions,
   configurability or error handling that nothing asked for. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Every changed line traces to the request. Don't reformat or refactor
   adjacent code; match its style. Remove what your change orphaned; mention other dead code,
   don't delete it.
4. **Goal-driven execution.** Turn the task into a check that can fail — "fix the bug" becomes "a
   test that reproduces it, then passes". For multi-step work, state the plan as
   `step → verify: check` and loop until each check passes.

## Keeping this file honest

When a doc changes a rule listed here, change it here in the same commit, or delete the line and
leave the link. A command added to the `Makefile` is added under Commands.
