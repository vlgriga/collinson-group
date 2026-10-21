.DEFAULT_GOAL := help
SHELL := /bin/bash

# Branch template: <type>/<issue>-<slug>, see docs/git-flow.md#branches.
empty :=
space := $(empty) $(empty)
BRANCH_TYPES := feature bugfix hotfix chore docs refactor test ci
BRANCH_PATTERN := ^($(subst $(space),|,$(BRANCH_TYPES)))/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$$
export BRANCH_TYPES BRANCH_PATTERN

# Tools run outside the service (drizzle-kit) read the same .env the service does.
-include .env
export $(shell sed -n 's/^\([A-Z_][A-Z0-9_]*\)=.*/\1/p' .env 2>/dev/null)

.PHONY: help doctor install migrate migration codegen dev-api dev-worker check fix test build gate \
	start pr ready merge cleanup branch-check

help: ## List every target
	@awk 'BEGIN { FS = ":.*## " } /^[a-z-]+:.*## / { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## Local setup

doctor: ## Report what this machine is missing, with the command that fixes it; changes nothing
	@scripts/doctor.sh

install: ## npm ci and the git hooks
	npm ci

migrate: ## Start Postgres from docker compose and apply the migrations
	docker compose up --detach --wait postgres
	npm run db:migrate

migration: ## Generate a SQL migration from src/db/schema.ts; read it before committing
	npm run db:generate

codegen: ## Regenerate the resolver types from schema.graphql
	npm run codegen

dev-api: ## Run the API in watch mode on http://localhost:4000/graphql
	npm run dev:api

dev-worker: ## Run the worker in watch mode, once Refresh is built
	npm run dev:worker

## Checks

check: ## Lint, format check and typecheck; changes nothing
	npm run lint
	npm run format:check
	npm run typecheck

fix: ## Apply what ESLint and Prettier can fix
	npm run lint -- --fix
	npm run format

test: ## Every test level, against real Postgres in containers (Docker must be running)
	npm test

build: ## Compile src/ to dist/
	@# tsc refuses a project with no inputs (TS18003); until src/ has code there is nothing to build.
	@if [ -n "$$(find src -name '*.ts' 2>/dev/null | head -n1)" ]; then npm run build; \
	else echo 'build: src/ has no TypeScript yet, nothing to compile'; fi

gate: check test build ## check + test + build: must pass before any push

## Flow, see docs/workflow-lifecycle.md

start: ## Worktree and branch for ISSUE=<n> [TYPE=feature] [TITLE=...]; issue to In Progress
	@scripts/flow.sh start

pr: ## Gate, push, open a draft PR closing the issue [TITLE=...]
	@scripts/flow.sh pr

ready: ## Lift the draft for the deep review; issue to In Review
	@scripts/flow.sh ready

merge: ## Squash-merge a ready PR with a composed message [MSG=<body file>], then clean up
	@scripts/flow.sh merge

cleanup: ## Remove a worktree and its branch [NAME=<directory>] [FORCE=1]
	@scripts/flow.sh cleanup

branch-check: ## Check the current branch, or BRANCH=<name>, against the template
	@scripts/flow.sh branch-check
