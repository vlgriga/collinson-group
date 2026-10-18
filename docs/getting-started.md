# Getting started

## What the machine needs

- **Node.js 22 LTS** with npm — the exact version is in `.nvmrc`, so `nvm use` (or `fnm use`)
  picks it up
- **git**
- **make**
- **Docker**, running — Postgres for local development comes from `docker compose`, and the
  integration and e2e tests start their own in containers (Testcontainers)
- **The GitHub CLI** — [`gh`](https://cli.github.com/), authenticated with the `project` scope
  (`gh auth login --scopes project`). It is how `make start` reads an issue and how the board is
  moved; without it the flow targets in [workflow-lifecycle.md](workflow-lifecycle.md) don't work

## Setting up

```bash
make doctor
```

It reports on each of the above — the tools and their versions, the `gh` login and its scopes,
Docker, `.env`, the git settings this project expects (`pull.rebase`, see
[git-flow.md](git-flow.md)), and the git hooks. It changes nothing itself: every line it is unhappy
about carries the command that fixes it, so what is wrong stays visible rather than being quietly
repaired on one machine and missing on the next.

Once it is green:

```bash
make install      # npm ci; also installs the git hooks (husky)
make migrate      # start Postgres from docker compose and apply the migrations
make dev-api      # http://localhost:4000/graphql, in watch mode
make dev-worker   # in another terminal: the refresh jobs
```

Or run the whole stack in containers: `docker compose up --build`.

A new worktree from `make start` shares `.env` and the Postgres from `docker compose` with the main
checkout, but not `node_modules`: run `make install` in it first.

## Checking your work

```bash
make check    # lint, format check and typecheck, changing nothing
make fix      # apply what ESLint and Prettier can fix
make test     # every test: unit, integration and e2e, against a real Postgres
make gate     # check + test + build: what the pre-push hook and CI run
```

`make check` changes no files, so running it twice leaves the tree exactly as it was. That is what
makes it honest in CI.

## Changing the schema

```bash
make codegen     # regenerate the resolver types after editing schema.graphql
make migration   # generate a SQL migration from changes to src/db/schema.ts
```

A database change is three steps:

1. Edit `src/db/schema.ts`.
2. `make migration`, then read the generated SQL in `src/db/migrations/` — it is what will run
   against the database, not the TypeScript.
3. Commit the schema and the migration together. A migration that has been applied is never
   edited; a new one is added instead.

## Where the configuration lives

All configuration comes from environment variables. `.env.example` lists every variable the
service reads, with a value that works locally, and it is the file `.env` is made from
(`cp .env.example .env`). `src/config/env.ts` validates them at startup, and the process exits if
any is missing or invalid, so a setting added without the variable that fills it fails on the first
run rather than in production. The logging variables are described in
[logging.md](architecture/logging.md#configuration).

How the project is worked on is declared apart from how the service runs, each where it is
enforced: the commit grammar and scopes in `commitlint.config.js`, the branch template in the
`Makefile`, the labels and areas in `.github/labels.yml`, and the board's project and field IDs at
the top of `scripts/board.sh`.
