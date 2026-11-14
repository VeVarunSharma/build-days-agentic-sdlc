# Lab 2: Multi-agent orchestration

## Outcome

Coordinate bounded agents from one main Session in this repo.

## Prerequisites

Lab 1's specification, reviewed Plan, and four child issues are ready.

## Participant steps

**Use:** Interactive mode in the main repository Session.

**Attach:** The parent, Plan, and sorting-contract child.

**Prompt:** Implement only the sorting contract within this child's owned paths.
Do not implement sorting or UI behavior yet. Run focused contract checks.

**Expect:** A green foundation commit.

**Decide:** Review the diff and results before starting dependent tasks.

**Use:** `/orchestrate` in the same Session.

**Attach:** The foundation commit and ready API/UI child issues.

**Prompt:** Coordinate these two tasks in this repo only. Use one isolated
session/worktree per child. Keep file ownership separate, stop on contract
conflicts, and return changes with exact check results. Do not merge.

**Expect:** Separate API and UI changes based on the reviewed foundation.

**Decide:** Open each agent's Session to inspect its files and diff. Send one
steering message that narrows a test or accessibility expectation. Use
Autopilot only while the scope remains clear.

## Expected repository artifacts

A foundation commit, API/UI changes, and focused-check results on the child issues.

## Verification

Check that agents stayed in this repo and their owned paths. Review actual
diffs and test output before integrating.

## Recovery

Pause work if contracts change. Review the affected agent's patch without
discarding another contributor's edits. If orchestration is unavailable,
complete the children sequentially in the main Session.

## Stretch

Try `/fleet` for ready, non-overlapping tasks in a fresh exercise copy.
Do not launch a second owner for work already running.

[Previous: SDD](01-SDD-with-the-GHCP-app.md) | [README](../../README.md) | [Next: Build, test, deploy](03-build-test-deploy.md)
