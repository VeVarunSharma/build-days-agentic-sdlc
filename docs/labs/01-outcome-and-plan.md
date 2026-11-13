# Lab 1: SDD with the GitHub Copilot App

## Outcome

Use the App's native flow to define a feature, review its specification and Plan,
then approve implementation. This is our approach to spec-driven development.

## Prerequisites

Follow [Open your repo in a Session](../../README.md#open-your-repo-in-a-session)
and finish setup. Select Copilot Fusion in that repository Session.

## Participant steps

### Clarify in Interactive

**Use:** The Session's **Interactive** mode.

**Attach:** `AGENTS.md`, `DESIGN.md`, and the product query/catalogue code.

**Prompt:** Help me specify price low-to-high/high-to-low sorting for Babazon.
Inspect what already works. Ask about default order, equal prices, filter/reset
behavior, accessibility, and failure cases. Keep search, category filters, cart,
and checkout working. Do not edit code yet.

**Expect:** A short, concrete specification with observable acceptance criteria.

**Decide:** Agree on the behavior and record the outcome in a parent GitHub issue.
Inspect the models used by Fusion; it may choose one model or several.

### Review in Plan

**Use:** Switch to **Plan** below the prompt, or type `/plan`.

**Attach:** The parent issue and agreed specification.

**Prompt:** Plan this feature within one repo. Show the specification and tasks
in the Plan canvas. Define exactly four children with dependencies, owned paths,
prohibited paths, and focused checks. Do not implement.

**Expect:** A reviewable Plan, not code changes.

**Decide:** Open the Plan canvas, read it, and request one useful revision.
Approve only after the specification and tasks agree:

| Child | Owns | Depends on |
|---|---|---|
| 1. Sorting contract | Shared types/schema and contract tests | None |
| 2. Catalogue/API | Server behavior and catalogue/API tests | 1 |
| 3. Sort control | Client code and UI tests | 1 |
| 4. Integration | Browser checks and evidence | 2, 3 |

### Move to implementation

After approval, choose **Autopilot** for clear tasks, or stay Interactive for
closer steering. Continue in Lab 2. Modes and built-in skills are part of the
App; no separate SDD framework or repository spec folder is required.

## Expected repository artifacts

One parent issue, the reviewed Copilot App Plan, and four bounded child issues.

## Verification

Check defaults, ties, filters, ownership, and tests before approving code work.

## Recovery

If Fusion is unavailable, record that gap and use an allowed model. If the
Plan canvas is unavailable, review the plan in the Session and record the limitation.

## Stretch

Use `/` to explore the App's built-in skills. Identify which one can coordinate
the ready tasks in Lab 2.

[README](../../README.md) | [Next: Multi-agent orchestration](02-multi-agent-orchestration.md)
