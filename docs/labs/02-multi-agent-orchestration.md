# Lab 2: Bounded implementation

## Outcome

Stabilize shared product contracts, then run non-overlapping API and UI work in
isolated sessions.

## Prerequisites

- The parent issue and reviewed Copilot App Plan exist.
- Four child issues declare dependencies, owned paths, prohibited paths, and
  focused tests.

## Participant steps

**Use:** Interactive mode for the foundation child.

**Attach:** The parent issue, reviewed Plan, foundation child issue,
`AGENTS.md`, and `DESIGN.md`.

**Prompt:** Implement only the shared product contract and deterministic
catalogue child. Stay inside its owned paths, run its focused tests, and update
the child issue with exact results.

**Expect:** Stable product and query contracts, deterministic seed data, and a
green focused test before dependent work begins.

**Decide:** Mark the foundation dependency complete only after reviewing the
diff and test output.

**Use:** Fleet with one isolated session per ready child.

**Attach:** The reviewed Plan and the separate API and UI child issues.

**Prompt:** For each child, implement only its acceptance criteria and owned
paths. Treat prohibited paths as hard boundaries. Pause on contract ambiguity.
Run focused tests and prepare a pull request linked to the parent and child.

**Expect:** Separate branches or worktrees with no overlapping file changes.

**Decide:** Pause. Re-read the child issue before accepting any change outside
its boundary. Use Autopilot only when the task and validation are unambiguous.

## Expected repository artifacts

- One reviewed foundation change.
- Separate API and UI branches or sessions.
- Child issue comments containing exact test commands and results.

## Verification

Ask the App to compare changed files across active sessions and report overlap,
missing dependencies, or prohibited-path edits. Review `git diff` and focused
test output before opening pull requests.

## Recovery

If a session crosses ownership, stop it, keep the valid patch, revert unrelated
files, and restart from the child issue. If contracts are unstable, pause Fleet
and return to one Interactive session.

## Stretch

Add a deliberate reviewer steering message that narrows a test or accessibility
expectation, then record how the session incorporated it.
