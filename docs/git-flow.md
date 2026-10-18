# Git flow

> Related: [Workflow](workflow-lifecycle.md) · [Review](review.md)

How branches, commits and pull requests are shaped. How an issue moves through them — the `make`
targets and the board — is in [workflow-lifecycle.md](workflow-lifecycle.md).

## Principles

- Linear history — rebase, never merge
- Isolated work — one worktree per issue
- Review is mandatory — nothing is pushed to `main` directly
- One grammar for branches and commits, enforced rather than asked for
- **Everything in English** — commits, branch names, pull request titles and descriptions

## Branches

`main` is the only long-lived branch and the deliverable; there are no releases and no tags. Work
branches from it and returns to it; there is no integration branch in between, because with one
deployable trunk it would only add a second place for the same change to sit.

Branch names follow [Conventional Branch](https://conventionalbranch.org/): `<type>/<description>`,
lowercase, words separated by hyphens. The issue number goes at the front of the description, so
that the branch, the commits and the board all name the same thing:

```
feature/12-surfing-scorer
bugfix/27-naive-datetime-rejected
```

The types are `feature`, `bugfix`, `hotfix`, `chore`, `docs`, `refactor`, `test` and `ci`. A
`hotfix` takes the same path as a `bugfix`; the name only says it jumps the queue. `main` itself
carries no prefix.

Both the branch name and the commit message are checked before they are recorded: the commit-msg
hook runs commitlint and matches the current branch against the template in the `Makefile`, so a
misnamed branch cannot take its first commit. A mistake in either is reported at the moment it is
made rather than at review.

## Setting git up

Linear history needs `git pull` to rebase rather than merge:

```bash
git config --local pull.rebase true
```

## Worktrees

The preferred way to work: several issues at once, each in its own directory, with no stashing and
no switching branches. `make start` creates one and `make cleanup` removes it; both are described
in [workflow-lifecycle.md](workflow-lifecycle.md#the-flow).

The branch is taken from `origin/main`. `.env` is linked from the main checkout; `node_modules` is
not, and a new worktree runs `make install`, because one worktree's install would otherwise rewrite
another's dependencies.

Cleanup does not throw work away: with uncommitted changes, or commits that are not on `origin`, it
stops and asks for `FORCE=1`.

## Commits

The format is [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), enforced by
commitlint (`commitlint.config.js` holds the types and scopes).

```
<type>(<scope>): #<issue> <description> (#<pr>)

<body>

<footers>
```

Angle brackets mark a substitution and do not appear in the message; the parentheses around the
scope and the pull request number are literal. Issues and pull requests share GitHub's numbering, so
both are written `#<n>`.

- `type` — from the table below
- `scope` — the module; for work outside a module, the area (see [Scopes](#scopes))
- `#<issue>` — the issue the work belongs to, right after the colon. A change with no issue has
  none
- `description` — lower case, no full stop, around 50 characters so the subject stays under 72
- `(#<pr>)` — only on the squash commit on `main`; see [The pull request number](#the-pull-request-number)
- a breaking change is marked with `!` before the colon and explained in a `BREAKING CHANGE` footer
- `Refs: #<issue>` in the footers, so the link survives a rewritten subject
- `Decision: <the choice> — <why>` in the footers, one per choice made on purpose where another
  would have looked just as right. Reviewers read them before raising a finding, and the pull
  request description collects them

| Type | When |
|---|---|
| `feat` | A new capability |
| `fix` | Behaviour corrected |
| `refactor` | Behaviour unchanged |
| `perf` | Faster or cheaper |
| `revert` | Undone |
| `docs`, `test`, `chore`, `ci`, `build` | The product does not change |

A commit on a branch, and the same change once it lands on `main`:

```
feat(scoring): #12 add surfing scorer

Scores each day from wave height, swell period and offshore wind, capped
at zero for inland locations without marine data.

Refs: #12
Decision: wind direction relative to the coast is ignored — the coastline
  orientation is not in any data source we have
```

```
feat(scoring): #12 add surfing scorer (#34)
```

### Scopes

The scope is the module the change lives in — `graphql`, `ranking`, `locations`, `weather`,
`scoring`, `jobs`, `db`, `shared`, `config` — and for work outside `src/`, the area: `infra` for
Docker, CI and tooling, `docs` for documentation. A change across several modules takes the one
it is about; if it is equally about two, it is probably two commits.

Scopes are not the `area:*` labels: a label says which parts of the service an issue touches, a
scope says where one commit's change sits.

### The body

The subject says, briefly and precisely, what the change is. The body gives the detail: why it was
needed, what it does in summary, and what it breaks if anything.

- A short summary of the diff — what actually changed, in two or three lines, not a list of files
- The reason, and where the choice was not obvious, why this one
- More than a few lines usually means the commit is two commits

What does not fit belongs in the pull request description, which is where there is room for it.

### The pull request number

The number is only known once the pull request exists — it is not guessed by adding one to the last
one. It reaches `main` not by rewriting the branch's commits but through the squash commit message,
whose subject is composed at merge time from the pull request title and its number. Squashing
applies even to a single commit: it stays one commit, and takes the squash message.

## Pull requests

- A pull request targets `main`; a sub-branch of a large issue targets its parent branch
- Squash is required: one pull request becomes one commit on `main`, its subject the pull request
  title with its number. Merging without it carries the whole branch history into `main`
- The branch is deleted once merged

### Ready to merge

Stated as values, so the bar moves by changing a number rather than the prose around it:

- Draft: lifted
- Conflicts with `main`: none
- CI: the workflow green in full; skipped or manual jobs do not count
- Approvals from people: 0
- Deep review: ended with nothing blocking ([review.md](review.md#deep))
- Open review conversations: 0

Beyond these, the author's go-ahead: given for this pull request, after reviewing it. It is not a
GitHub approval, which the author cannot give their own pull request, and `make merge` cannot check
it, so whoever runs `make merge` has it first.

Approvals are 0 because this is a one-person repository: GitHub does not count the author's own
approval, so 1 would turn every merge into an admin bypass. The deep review loop is the review.
Raise the number to 1 when a second person joins.

Branch protection on `main` enforces what GitHub can: pull request required, CI required, squash
only, conversations resolved before merge.

### Title and description

The **title** follows the commit template above without the `(#<pr>)` suffix, because squashing
turns it into a commit message; CI checks it with the same commitlint configuration. The
**description** follows [`.github/pull_request_template.md`](../.github/pull_request_template.md)
and is never empty; the template says per section what it holds.

### The squash message

A commit like any other — the same convention, the same sections, the same requirements. The one
difference is the body: a summary written afresh from all the pull request's commits, not their
bodies pasted one after another, since it is the only one of them that stays on `main`.

`make merge` composes it rather than leaving it to GitHub's default: the subject is the title with
`(#<pr>)`, the footers are `Refs: #<issue>` and every `Decision:` from the branch's commits, and
the body is written by the author — in `$EDITOR`, or from a file given as `MSG=<file>` when no one
is at a terminal. commitlint checks the result before the merge goes through.
