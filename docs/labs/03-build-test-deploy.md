# Lab 3: Integrate and prove

## Outcome

Integrate catalogue API and search/filter UI changes and produce deterministic
local, CI, and browser evidence.

## Prerequisites

- Foundation, API, and UI child issues have reviewable pull requests.
- Focused tests pass on each branch.

## Participant steps

**Use:** Copilot App Interactive mode on the integration child.

**Attach:** Parent issue, reviewed Plan, all child issues, pull requests, and
the current CI results.

**Prompt:** Integrate the approved product discovery changes. Resolve only
integration defects. Verify catalogue browsing, text search, category
filtering, clearing filters, page availability, and accessible loading, empty,
and failure states. Run the smallest relevant checks before the full repository
check.

**Expect:** A clean integration diff, actionable failures, and evidence tied to
the tested commit.

**Decide:** Merge only when required checks and human review agree with the
parent acceptance criteria.

## Expected repository artifacts

- Linked pull requests for all four child issues.
- Focused test results and a passing full check.
- Browser evidence for the shopper journey.
- Optional protected Azure deployment evidence.

## Verification

Ask the App to run `npm run check`, inspect CI on the current pull-request head,
and summarize pass/fail results without hiding unavailable checks. Record the
exact command, result, commit, and link for each receipt. For optional Azure
work, verify `/health`, `/ready`, `/api/products`, a search query, a category
query, and the application page. Optional deployment details live in
`../../infra/README.md`.

## Recovery

If integration is not green within 30 minutes, create a recovery branch from
the last green commit and reapply only reviewed child commits.

## Stretch

Run the protected optional deployment workflow and attach its machine-readable
evidence artifact to the integration pull request.
