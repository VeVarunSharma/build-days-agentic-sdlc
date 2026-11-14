# Lab 4: Cloud agent

## Outcome

Delegate a narrow change and review a human-requested revision.

## Prerequisites

Use the seeded follow-up issue in this repo. It is separate from the four
sorting children and owns only `src/server/app.ts` and `tests/api.test.ts`.

## Participant steps

**Use:** Open the issue on GitHub and assign it to Copilot's cloud agent.
Review its pull request on GitHub or in the App.

**Attach:** The issue, repo guides, and current API tests.

**Prompt:** Add `Cache-Control: no-store` to `/health` and `/ready`.
Preserve response bodies/statuses. Cover health, ready, and unavailable-ready
responses. Stay within the two owned files.

**Expect:** Reviewable changes with focused API evidence.

**Decide:** Request a `HEAD /health` assertion proving the header and empty body.
Review the revision before approval.

## Expected repository artifacts

The issue/change link, requested revision, agent response, and final evidence.

## Verification

Check ownership, run `npm test -- tests/api.test.ts`, then `npm run check`.
Record both the initial result and revision.

## Recovery

If cloud-agent access is unavailable, use an isolated local App session and
record `capability-unavailable`.

## Stretch

Identify another operational edge case without expanding ownership.

[Previous: Build, test, deploy](03-build-test-deploy.md) | [README](../../README.md) | [Next: Agentic workflows](05-gh-aw.md)
