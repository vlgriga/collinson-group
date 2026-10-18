---
name: plan-feature
description: Plan one feature from the PRD — gather its requirements, propose its design and steps, wait for the author's approval, then file the issues and open the design doc PR
when_to_use: when the author asks to plan a feature or the next piece of work; best run in plan mode
---

# Plan a feature

A feature is a capability the author names ("activity ranking", "background refresh"). This skill
turns it into a design doc and issues. It does not start any step. The process around it is in
[workflow-lifecycle.md](../../../docs/workflow-lifecycle.md#planning).

Run it in plan mode: steps 1–4 only read and ask, and leaving plan mode is the author's approval.

**Announce at start:** "I'm using the plan-feature skill to plan <feature>."

## 1. Know the ground

- Read [prd.md](../../../docs/prd.md), the [architecture](../../../docs/architecture.md), the
  [decisions](../../../docs/decisions/) and the existing design docs in `docs/design/`.
- Read what is already planned and done, so nothing is planned twice:
  `gh api --paginate 'repos/{owner}/{repo}/milestones?state=all' --jq '.[] | "\(.title) \(.state)"'`
  and `gh issue list --state all --limit 1000 --json number,title,state,milestone`.

## 2. Gather the requirements

Ask the author until it is clear which PRD requirements (R…, N…) the feature covers, what is out of
it, and what it needs that the PRD does not say. Don't pick a reading silently. A requirement the
PRD lacks becomes a PRD change in the proposal.

## 3. Design

The design doc is the technical description of this feature, within the architecture:

```markdown
# <Feature>

## Context
The problem, and the requirements covered: R…, N….

## Goals and non-goals

## Design
Modules touched, data flow, data model and API changes, error handling.

## Alternatives considered
Each with why it was not chosen.

## Testing
What is tested at which level, and through which entry point.

## Risks and open questions
```

If a design doc for the feature already exists, check it against the requirements and propose the
changes instead. A choice that matters beyond the feature becomes an ADR; a change to the system's
shape becomes an update to the architecture.

## 4. Cut the steps, propose, stop

Each step becomes one issue, done in one session, ending in one PR. A step is a **vertical
slice**, shown working through its entry point
([testing.md](../../../docs/testing.md#where-a-test-enters)); the first step of the first feature
is a **tracer** through every layer. It merges on its own, leaves `main` green, is one reviewable
PR, and has acceptance criteria a test can check.

Show the proposal: the requirements in scope, the design doc draft, and

```
| # | Step | Requirements | Delivers | Blocked by | Areas |
|---|------|--------------|----------|------------|-------|
```

with each step's acceptance criteria and a coverage line per requirement. Then **stop**. The author
approves or edits; rework until they approve. Nothing is created before that.

## 5. File, write, hand over

`<feature>` below is the feature's name; every `<issue>` is an issue number. A feature may
already have its milestone and its "Design: <feature>" issue, filed ahead of planning: use them,
and update the design issue's requirements if planning changed them.

1. The milestone, unless it exists:
   `gh api 'repos/{owner}/{repo}/milestones' -f title='<Feature>' -f description='<goal>'`.
2. The issues, in order, each with `--milestone '<Feature>'` and its `area:*` labels: first
   **"Design: <feature>"** (`area:docs`), unless it exists, then one per step, each blocked by the
   design issue and by whatever else it named. Body:

   ```markdown
   <what is wanted and why, in two or three sentences>

   Requirements: R…, N… ([PRD](https://github.com/vlgriga/collinson-group/blob/main/docs/prd.md))
   Blocked by: #<issue>, … (or None)

   ## Acceptance criteria

   - [ ] …
   ```

3. Check that every issue reached the board in *Backlog*, which the project's workflows do. If one
   did not, tell the author rather than moving it by hand.
4. Do the design issue as [do-issue](../do-issue/SKILL.md) steps 3–5, with `TYPE=docs` and no
   TDD question: `docs/design/<feature>.md` as approved, with any PRD, ADR or architecture
   changes, through the shallow and deep reviews to a ready PR with green CI.
5. Report the milestone, the issues and the design PR, and **stop**. The design PR merges only on
   the author's "merge" for it, as in [do-issue](../do-issue/SKILL.md#6-hand-over-then-stop); if
   review changes the design, update the step issues to match before merging. The steps are then
   picked up one per session with `/do-issue <issue>`.
