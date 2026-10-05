# Workshop wrap: Evidence and handoff

## Outcome

Leave a reviewer-readable chain from outcome to merged evidence.

## Prerequisites

- Child pull requests are merged or have explicit follow-up.
- Required checks have final results.

## Participant steps

**Use:** Copilot App Interactive mode.

**Attach:** The parent issue, reviewed Plan, four child issues, pull requests,
CI results, security results, and optional deployment evidence.

**Prompt:** Build a concise evidence matrix mapping every parent acceptance
criterion to a child issue, pull request, exact validation result, and remaining
risk. Distinguish passed, failed, and unavailable checks.

**Expect:** A traceable summary that does not rely on agent conversation history.

**Decide:** Close the parent only when all acceptance criteria have evidence or
an explicit follow-up owner.

## Expected repository artifacts

- Parent issue evidence summary.
- Closed or clearly deferred child issues.
- Links to CI, security, browser, and optional deployment receipts.

## Verification

Have a teammate follow the links without using the originating App sessions.
Any unverifiable statement becomes a follow-up.

## Recovery

Create a recovery branch from the last reviewed merge or pull-request commit,
then re-run validation on the recovered state.

## Stretch

Record one process improvement as a new repository issue with a measurable
outcome and owner.
