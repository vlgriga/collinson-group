# 0007. GraphQL Yoga, schema-first with codegen
- Status: Accepted
- Date: 2026-10-18

## Context
The stack mandates GraphQL. The API surface is small (one query), and reviewers should be able to read the contract at a glance.

## Decision
Use **GraphQL Yoga** with a hand-written `schema.graphql` (SDL) and **graphql-codegen** to generate TypeScript resolver types.

## Consequences
- The schema file is the contract — easy to review and diff.
- Resolvers are type-checked against the schema; drift fails `typecheck`.
- Yoga is lightweight, fetch-API based (easy in-process e2e tests via `yoga.fetch`), and has Envelop plugins for depth/cost limiting.
- Requires a codegen step (`npm run codegen`) wired into build and CI.

## Alternatives considered
- **Apollo Server 4** — most widely known; heavier and more vendor-oriented for no gain here.
- **Pothos (code-first)** — excellent type inference without codegen, but the contract is spread across TypeScript builders.
