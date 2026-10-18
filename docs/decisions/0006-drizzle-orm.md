# 0006. Drizzle ORM for data access
- Status: Accepted
- Date: 2026-10-18

## Context
The dominant write is a bulk upsert of ~7 rows per location per fetch on composite keys; reads are a few indexed lookups. Two processes share the database and the `pg` driver with pg-boss.

## Decision
Use **Drizzle ORM** with schema defined in TypeScript and **drizzle-kit** generating SQL migrations, over the `pg` driver.

## Consequences
- Typed bulk `INSERT … ON CONFLICT DO UPDATE` without raw SQL.
- Row types inferred from the schema; no codegen step or separate engine in Docker/CI.
- SQL-like API keeps queries readable; migrations are plain, reviewable SQL.
- Pre-1.0 library: more API churn than Prisma. Contained behind repositories, so replacement is cheap.

## Alternatives considered
- **Prisma** — mature and popular, but `upsert` is single-row (bulk needs raw SQL), plus a generate step.
- **Kysely** — excellent query builder; table types and migrations would be hand-written.
- **Raw `pg` + SQL** — most transparent and smallest; manual row mapping. Viable with 5 tables.
