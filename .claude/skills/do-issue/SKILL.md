---
name: do-issue
description: Do one GitHub issue in this session — from the TDD question to a reviewed, ready PR — then stop; merge only on the author's explicit "merge" for that PR
when_to_use: when the author asks to pick up, start, work on or do issue <n>
---

# Do an issue

One issue, one session, one PR. The steps are the flow in
[workflow-lifecycle.md](../../../docs/workflow-lifecycle.md#the-flow); this skill is the order to
run them in and where to stop.

**Announce at start:** "I'm using the do-issue skill for #<n>."

## 1. Read the issue

- `gh issue view <n> --json title,body,labels,milestone,state`.
- If its "Blocked by" names an issue that is still open, say so and ask the author whether to go
  on. If the acceptance criteria are unclear, ask before writing anything.
- Read the docs [CLAUDE.md](../../../CLAUDE.md) points to for this kind of work.

## 2. Before any code

Ask the author once whether the issue is done with TDD. If yes, draw the scenario list from the
acceptance criteria, with each scenario's entry point and level, and have the author confirm it
([testing.md](../../../docs/testing.md#tdd)).

## 3. Start

```bash
make start ISSUE=<n> TYPE=<type>     # from the main checkout
make install                         # in the worktree, after switching into it
```

`TYPE` follows the work: `bugfix` for an issue labelled `bug`, `docs`, `chore`, `test`, `ci` or
`refactor` where that is all it is, `feature` otherwise.

Switch the session into the worktree `make start` prints with the `EnterWorktree` tool (`path`),
not with `cd`: every later step runs there, the reviews included. Their agents start in the
session's directory, and started from the main checkout they check the branch out in it.

## 4. Implement

- TDD: red → green → refactor, one scenario at a time. Otherwise: the code, then its tests.
- Commits follow [git-flow.md](../../../docs/git-flow.md#commits), with a `Decision:` footer for
  each choice made on purpose.
- A design deviation becomes an ADR or a follow-up issue, not a comment.

## 5. Check and review

1. `make gate` passes.
2. Shallow review: `/code-review low`. Fix each finding, or note why not for the PR description.
3. `make pr`, then fill in every section of the description from
   [the template](../../../.github/pull_request_template.md): `gh pr edit --body-file <file>`.
4. `make ready`.
5. Deep review: `/code-review high` on the PR, then `/code-review medium` for each round after the
   fixes, looping as [review.md](../../../docs/review.md) describes until nothing blocking is left. Push the fixes; each push goes through the gate.
   Leave how the review ended on the PR as a comment (`gh pr comment`): each finding and how it
   was settled ([review.md](../../../docs/review.md#deep)).
6. Wait for CI to be green: `gh pr checks --watch`. If a check fails, fix it, push, and repeat
   steps 5–6.

## 6. Hand over, then stop

Report the PR link, what it does, what the reviews found and how each finding was settled. Then
**stop**: the author reviews the PR.

- **"merge"** from the author, for this PR: write the squash body
  ([git-flow.md](../../../docs/git-flow.md#the-squash-message)) to a file outside the worktree
  (`mktemp`) and run `make merge MSG=<file>` in the worktree. It ends by removing the worktree, so
  return to the main checkout with `ExitWorktree` (`keep`). Nothing else counts as a go-ahead, and a go-ahead for one PR
  does not carry over to another.
- **Changes requested:** `scripts/board.sh move <n> 'In Progress'`, make them, `git push` (the
  hook runs the gate), update the PR description if what it says changed, then steps 5.5–5.6
  again, `scripts/board.sh move <n> 'In Review'`, and hand over again. The PR already exists:
  don't run `make pr` or `make ready` a second time.
