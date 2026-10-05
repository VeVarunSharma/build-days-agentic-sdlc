# Lab 4: Cloud agent revision

## Outcome

Delegate a narrow operational change, request a human revision, and preserve
the review trail.

## Prerequisites

- The prepared team repository includes the cloud-agent child issue.
- The issue owns only `src/server/app.ts` and `tests/api.test.ts`.

## Participant steps

**Use:** GitHub coding agent from the seeded issue.

**Attach:** The issue, `AGENTS.md`, `DESIGN.md`, and current API tests.

**Prompt:** Add `Cache-Control: no-store` to `/health` and `/ready` without
changing response bodies or status codes. Cover successful health, successful
readiness, and unavailable readiness. Do not change client, shared, workflow,
or infrastructure files.

**Expect:** A linked pull request with focused API test evidence.

**Decide:** Request a revision adding a `HEAD /health` regression assertion,
then approve only after the new test and required checks pass.

## Expected repository artifacts

- Seeded issue linked to a cloud-agent pull request.
- Human-requested revision and agent response.
- Focused test and CI evidence on the final head.

## Verification

Inspect the diff for owned-path compliance and confirm the pull request records
both the initial result and requested revision.

## Recovery

If cloud coding agent access is unavailable, perform the same bounded issue in
an isolated local App session and label the issue `capability-unavailable`.

## Stretch

Ask review to identify one operational edge case without expanding file
ownership.
