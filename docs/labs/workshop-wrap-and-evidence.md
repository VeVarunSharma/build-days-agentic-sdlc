# Workshop wrap: Evidence and handoff

## Outcome

Leave a reviewer-readable chain from one outcome through both repositories to
reviewed changes and QA automation evidence.

## Prerequisites

- Child pull requests in both repos are merged or have explicit follow-up.
- Required checks have final results.

## Participant steps

**Use:** Copilot App Interactive mode in the shared Project.

**Attach:** The parent issue, reviewed Plan, four child issues, pull requests,
both repos' CI results, the QA triage run/issue, ordinary scanner results, and
optional deployment evidence.

**Prompt:** Build a concise evidence matrix mapping every parent acceptance
criterion to a repository-qualified child issue, pull request, exact validation
result, and remaining risk. Include the tested app/service SHAs and contract
version. Link the failed QA run and triage issue; distinguish observed failures
from agent hypotheses. Distinguish passed, failed, missing, and unavailable
checks. Record which Fusion effort level was tried and whether the Project
actually coordinated both repos.

**Expect:** A traceable summary that does not rely on agent conversation history.

**Decide:** Close the parent only when all acceptance criteria have evidence or
an explicit follow-up owner.

## Expected repository artifacts

- Parent issue evidence summary.
- Closed or clearly deferred child issues.
- Paired app/service commit references and links to CI, browser, QA triage,
  ordinary security scanning, and optional deployment receipts.

## Verification

Have a teammate follow the links without using the originating App sessions.
Check that replaying the QA workflow did not create a duplicate and that a
successful-run replay produced no issue. Any unavailable live capability or
unverifiable claim becomes an explicit gap, not a passing receipt.

## Recovery

Create recovery branches from the last reviewed app/service commit pair, then
re-run validation. Use explicit SHAs, not independently moving default branches.

## Stretch

Record one process improvement as a new repository issue with a measurable
outcome and owner.
