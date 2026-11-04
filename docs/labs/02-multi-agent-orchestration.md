# Lab 2: Bounded implementation

## Outcome

Stabilize the service-owned HTTP contract, then use the Project to coordinate
non-overlapping service-query and app-integration work.

## Prerequisites

- The parent issue and reviewed Copilot App Plan exist.
- Four child issues declare dependencies, owned paths, prohibited paths, and
  focused tests.
- Both participant repositories are attached to the same Copilot Project.

## Participant steps

**Use:** Interactive mode for the foundation child.

**Attach:** The parent issue, reviewed Plan, foundation child issue,
both repos' `AGENTS.md`/`DESIGN.md`, and the service's `contracts/` examples.

**Prompt:** In the catalogue-service repo, implement only the contract
foundation child. Specify list/detail shapes, text/category query semantics,
validation/not-found/outage behavior, and stable examples. Preserve the eight
product IDs and integer priceCents. Do not implement service queries or the app
adapter. Run focused contract checks and record exact results on the child.

**Expect:** A stable service-owned contract and a reviewed, green foundation
commit that both dependent sessions can use.

**Decide:** Mark the foundation dependency complete only after reviewing the
diff and test output.

**Use:** Fleet with one isolated session per ready child.

**Attach:** The reviewed Plan, the foundation commit, and the separate service
and app child issues. State the target repository for each.

**Prompt:** Coordinate the ready children across the Project's two repos. One
service session implements search/category queries and API tests; one app
session implements the HTTP ProductCatalogue adapter and operational behavior.
Each must use an isolated worktree/branch, stay in its owned paths, and treat
prohibited paths as hard boundaries. Pause on contract ambiguity. Run focused
tests and prepare repo-specific pull requests linked to the parent and child.

**Expect:** Separate branches or worktrees with no overlapping file changes.

**Decide:** Pause. Re-read the child issue before accepting any change outside
its boundary. Use Autopilot only when the task and validation are unambiguous.

Open the Project's **Overview** to see Working, Needs input, Open, and Done.
Select a session to inspect its repository and diff; use **Steer this session**
to narrow its work. A Project is the coordinator, not permission for agents to
change both repositories indiscriminately.

Introduce an explicit `CATALOGUE_URL` setting in the app integration child.
The published app starter does not support it yet. In service mode, no request
may silently fall back to `InMemoryProductCatalogue`; preserve that implementation
for the standalone starter and isolated tests.

## Expected repository artifacts

- One reviewed foundation change.
- Separate service-query and app-integration branches/sessions and pull requests.
- Child issue comments containing exact test commands and results.

## Verification

Ask the Project to compare **repository plus path** across sessions and report
overlap, missing dependencies, or prohibited-path edits. Review the actual
diffs and test output. The same relative path in two different repos is not an
ownership conflict; changing the shared contract during dependent work is.

## Recovery

If a session crosses ownership, stop it and review the patch before removing
only that session's unintended changes. Never discard someone else's work.
If contracts are unstable, pause Fleet and return to one Interactive session.

## Stretch

Steer the app session to prove startup during a service outage. Confirm that
the app's liveness remains available while readiness returns 503.
