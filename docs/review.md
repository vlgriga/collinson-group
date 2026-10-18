# Review

> Related: [Workflow](workflow-lifecycle.md) · [Architecture](architecture.md) · [Style guide](styleguide.md) · [Testing](testing.md) · [Decisions](decisions/)

Who checks what, and against which document.

A review in earnest is split into roles. Each works on its own, in its own area and from its own
documents, so that the pass does not collapse into one general reading where everything is judged
by feel.

A change is read adversarially: not whether it looks right, but what would have to be true for it
to be wrong. That is where findings come from, and it stops at evidence — a suspicion that could
not be shown is not one.

Before raising a finding, read the `Decision:` footers of the commits and the Decisions section of
the PR description ([git-flow.md](git-flow.md#commits)). A choice recorded there was made on
purpose: a finding against it has to answer its reason, not just prefer the alternative.

## Depths

Review has two depths, and they are two different things rather than one reading done twice. Both
run through Claude Code's `/code-review`; where each sits in the flow is in
[workflow-lifecycle.md](workflow-lifecycle.md#review).

### Shallow

`/code-review low`, before `make pr`. One quick pass, no roles. Its subject is what ESLint, `tsc`
and the tests cannot reach: whether the change is tested at all, the style guide where it is a
matter of judgement, the naming of files, types and functions — units in the names of physical
quantities included — GraphQL descriptions, documentation, typos and plain slips.

Structure is not its subject, and neither is anything that needs the whole change held in mind at
once. Both belong to the deep review.

Its threshold is deliberately higher than the deep one: it speaks to someone who is finishing, so
it may only speak when it is sure. Findings are printed and never posted to the pull request. A
blocking one stops the work going further, so `make pr` waits until it is fixed; the rest is
advice and the author decides, answering in the PR description what they chose not to fix.

### Deep

`/code-review high` on the pull request, after `make ready`. The full review: every role whose area
the change reaches, each working from its own documents, at the ordinary threshold.

It runs as a loop rather than as a single verdict — review, then fixes, then review again over what
the fixes changed — until nothing blocking is left.

A round is one turn of it: read where the review stands on the pull request, review what is new,
answer what came back and push the fixes. The loop is carried by those fixes — the push is what
starts the next round — so it ends of its own accord as soon as a round leaves nothing behind.

It ends the same way when what is still open needs a decision the review is not the one to take. A
design deviation is not settled in the PR thread: it becomes an [ADR](decisions/) or a follow-up
issue, and the pull request gets the `needs-decision` label until it is settled. A finding that
comes back unchanged after it was answered is such a decision too, not another round.

Every one of those endings is left on the pull request itself, as a comment, rather than only in
the terminal that ran the round. What follows an ending is a person picking the request up — to
merge it, to decide, or to send it back to *In Progress* — and they have to be able to see which
ending it was.

## Roles

The roles are the deep review; the shallow pass has none.

| Role | Area | Applies to | Documents |
|---|---|---|---|
| Architect | Module boundaries, dependency direction, ports, what belongs where | `src/`, `src/graphql/schema.graphql`, migrations, new modules and the seams between them | [architecture.md](architecture.md), [ADR 0008](decisions/0008-layered-modules-ports-at-seams.md), the other [decisions](decisions/) |
| Engineer | Style and bugs | Any executable code: `src/`, `test/`, `scripts/`, the `Makefile`, `.github/workflows/` | [styleguide.md](styleguide.md), [logging.md](logging.md) |
| QA | Test coverage and the quality of the tests | `src/` and `test/` | [testing.md](testing.md) |
| SQL | Queries, transactions, locks and the job queue | Code that reaches Postgres — `src/db/` (schema and migrations), the repositories in `locations/` and `weather/`, ingest, and `jobs/`, since pg-boss lives in the same database | [architecture.md §3](architecture.md#3-data-model), [styleguide.md](styleguide.md#database), ADRs [0001](decisions/0001-monolith-postgres-pg-boss.md), [0002](decisions/0002-hybrid-refresh-strategy.md), [0005](decisions/0005-daily-granularity-upsert.md), [0006](decisions/0006-drizzle-orm.md) |
| Team lead | A light pass over the change as a whole, and how it sits with the other open pull requests | Always | [workflow-lifecycle.md](workflow-lifecycle.md), [git-flow.md](git-flow.md) |

Applicability answers whether a role has anything to do on this particular change. A role with
nothing to do is not started at all: finding out from inside the role that this is not its area
means paying for an answer that was visible from the list of changed files. A docs-only change, for
one, needs the team lead and nobody else.

A skip has to be visible. A role that was not started is named in the report along with the reason
— otherwise a narrow rule silently switches a check off while the review still looks complete.

### Architect

Architecture strictly as the documentation describes it: which way dependencies point
(`graphql → ranking ← {locations, weather, jobs}`, `ranking → scoring`, `jobs → weather`), that
`ranking` sees only its own ports, that modules are reached only through their `index.ts`, that
concrete classes are wired only in `api.ts` and `worker.ts`, that resolvers stay thin and `scoring`
stays pure, and that the GraphQL schema changes only additively.

Nothing enforces these boundaries automatically, so this role is where they are held. It raises
nothing without pointing at a rule that is written down, in the architecture, an ADR or the style
guide's architecture rules. Objections by taste are not this role's to make; a rule that ought to
exist is a proposal for an ADR, not a finding.

### Engineer

Two jobs.

The first is the style guide and the logging rules as written. They do not cover everything the
project runs; where there is no rule, this job simply does not apply, and inventing one in its place
is not the role's to do.

The second is finding bugs, in any executable code whatever the language: logic that is wrong, code
that will fail at runtime, failures nobody handles, branches nobody took, edge cases, weak or
untrue typing. In this service the usual suspects are time and units — a calendar day computed in
UTC rather than the location's timezone, a `new Date()` where the `Clock` belongs, a quantity
converted in a scorer instead of at ingest — and Open-Meteo data trusted without passing through
zod.

### QA

Works from the testing document. Reads the tests around the changed code and answers: what is
covered and what is not, whether the test enters at the level the document sets for it, whether
effects are checked rather than only return values — the rows in Postgres, the job on the queue —
whether the failing paths are tested, Open-Meteo being down included, and whether there are tests
that are worthless: duplicating each other, asserting nothing, checking the implementation instead
of the behaviour, mocking something of our own, or waiting on a timer.

### SQL

What the change asks of the database, and whether it holds under concurrency:

- **Queries** — N+1, loading nobody uses, a filter or join no index serves, a query that can be
  shorter or cheaper. The request path has a budget well under 100 ms.
- **Transactions** — their boundaries, and what a failure between two of them leaves for a retry:
  daily rows upserted without their `forecast_fetches` row, or the other way round.
- **Locks** — what is locked, for how long, in which order; a lock released before its write.
  Concurrent upserts of the same location and day, from a cold miss and a refresh job at once.
- **The job queue** — singleton keys that actually de-duplicate, retries that are safe to repeat,
  a job enqueued inside or outside the transaction it depends on.
- **Constraints** — an invariant the code relies on and the schema does not enforce.
- **Migrations** — DDL that locks or rewrites a table, a change that cannot be rolled back, a
  generated migration nobody read, an applied migration edited instead of a new one added.

The role may run anything — `EXPLAIN` and a raced write included — but only against a throwaway
Postgres it starts itself through the Testcontainers helper the tests use. Never against the shared
`docker compose` database, which other worktrees rely on. Without such a container, it reads the
code alone.

### Team lead

A light pass with no deep dives: obvious mistakes, and the change against the
[workflow](workflow-lifecycle.md) and the [git flow](git-flow.md) — whether the branch, the PR title, the
description and `Closes #<n>` match the issue,
whether the `area:*` labels cover what the change touches, whether the commits mean anything,
whether the branch is carrying something it should not, whether docs were updated where behaviour,
config or scripts changed, and the rest of the definition of done.

With other pull requests open at the same time, it studies each of them — code, tests and
description — and checks that their decisions do not contradict this one's, that ADR numbers do not
collide, and that the migrations of both still form one chain: Drizzle numbers them and records them
in its journal, so two branches that each generated one will conflict on merge.

## What review does not cover

Everything the project checks automatically: Prettier and ESLint, `tsc`, codegen, commitlint and
the PR-title check, the unit, integration and e2e tests in CI. Formatting, lint rules, types,
commit grammar and failing tests are found without a reviewer and will be visible from the checks.

Repeating them as a comment costs twice: the reader's attention goes to something that is about to
be fixed anyway, and the real findings drown in the list.
