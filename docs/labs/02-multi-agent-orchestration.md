# Lab 2: Bounded implementation

## Outcome

Use the Project to coordinate service and app work after the contract is stable.

## Prerequisites

The parent, reviewed Plan, and four repository-qualified children exist.

## Participant steps

**Use:** Interactive mode for the contract child.

**Attach:** The parent, Plan, child issue, both repo guides, and service contract.

**Prompt:** Stabilize schemas, types, and examples within this child's paths.
Do not implement HTTP query behavior or the app adapter. Preserve browse/detail
compatibility. Run focused contract checks and record the result.

**Expect:** A reviewed, green foundation commit.

**Decide:** Complete the dependency only after checking the diff and results.

**Use:** The Project conversation.

**Attach:** The foundation commit and ready service-query/app-integration issues.

**Prompt:** Start one isolated session per ready child in its target repo.
Implement only the assigned behavior and tests. Stop on ownership or contract
conflicts. Record results and prepare repo-specific changes for review.

**Expect:** Separate branches/worktrees without overlapping ownership.

**Decide:** Use **Overview > Needs input** to resolve blockers and **Steer this
session** to narrow work. Use Autopilot only for clear, approved tasks.

The app child introduces `CATALOGUE_URL`; the starter does not support it yet.
Keep the standalone in-memory path, but never silently fall back in service mode.
Query HTTP expectations belong to the service-query child's API tests.

## Expected repository artifacts

A foundation commit, separate service/app changes, and exact focused-check receipts.

## Verification

Compare **repository plus path** across sessions. Review actual diffs and results;
an agent's completion message is not evidence.

## Recovery

Pause work if contracts change. Review only the offending session's patch;
never discard another contributor's edits.

## Stretch

Try Fleet instead of the Project-led launch on a fresh exercise copy. Keep the
same reviewed dependencies and ownership; never run duplicate owners together.
