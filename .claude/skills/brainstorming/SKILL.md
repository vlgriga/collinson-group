---
name: brainstorming
description: Interactive idea refinement using Socratic method to develop fully-formed designs
when_to_use: when partner describes any feature or project idea, before writing code or implementation plans
version: 2.2.0
progressive_disclosure:
  level: 1
  references: []
  note: Already optimal at 75 lines - intentionally compact, no references needed
---

# Brainstorming Ideas Into Designs

## Overview

Transform rough ideas into fully-formed designs through structured questioning and alternative exploration.

**Core principle:** Ask questions to understand, explore alternatives, present design incrementally for validation.

**Announce at start:** "I'm using the Brainstorming skill to refine your idea into a design."

## The Process

### Phase 1: Understanding
- Check current project state in working directory
- Ask ONE question at a time to refine the idea
- Prefer multiple choice when possible
- Gather: Purpose, constraints, success criteria

### Phase 2: Exploration
- Propose 2-3 different approaches
- For each: Core architecture, trade-offs, complexity assessment
- Ask your human partner which approach resonates

### Phase 3: Design Presentation
- Present in 200-300 word sections
- Cover: Architecture, components, data flow, error handling, testing
- Ask after each section: "Does this look right so far?"

### Phase 4: Write the Design Doc
When the design is approved, write it to `DESIGN.md` in the project root:
- Keep it concise (1-3 pages) - this is a test task, not an enterprise system
- Sections: Requirements, Assumptions, Architecture (Mermaid diagram), Components, Data model / API, Key decisions & trade-offs, Error handling, Testing, Out of scope
- Record the alternatives considered and why they were rejected

### Phase 5: Planning Handoff
Ask: "Ready to create the implementation plan?"

When your human partner confirms, outline the implementation steps (e.g. via Plan mode).

## When to Revisit Earlier Phases

**Go backward when:**
- Partner reveals new constraint during Phase 2 or 3 → Return to Phase 1 to understand it
- Validation shows fundamental gap in requirements → Return to Phase 1
- Partner questions approach during Phase 3 → Return to Phase 2 to explore alternatives
- Something doesn't make sense → Go back and clarify

**Don't force forward linearly** when going backward gives better results.

## Related Skills

**During exploration:**
- When approaches have genuine trade-offs: skills/architecture/preserving-productive-tensions

**Before proposing changes to existing code:**
- Understand why it exists: skills/research/tracing-knowledge-lineages

## Remember
- One question per message during Phase 1
- Apply YAGNI ruthlessly
- Explore 2-3 alternatives before settling
- Present incrementally, validate as you go
- Go backward when needed - flexibility > rigid progression
- Announce skill usage at start
