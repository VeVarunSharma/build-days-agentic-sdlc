# Lab 1: Frame the Babazon outcome

## Outcome

Try Copilot Fusion, then review one cross-repo outcome for product search and
category filtering in a Copilot Project.

## Prerequisites

- The app fork/assigned repo and your copy of
  [the service template](https://github.com/VeVarunSharma/babazon-catalogue-service)
  are open in the App, with Issues and Actions enabled.
- Both starters run from the instructor's approved revisions. Record both source
  SHAs and both participant starting commits; template-copy history is new.
- Create **Projects > +**, add both participant repositories, and use this
  Project for the shared goal. Projects is public preview, not a GitHub board.

## Participant steps

Use the README prompt-card pattern for this and every later lab.

### Try Fusion before making changes

**Use:** Copilot Fusion, preferably Fusion High when available, in the Project.

**Attach:** Both repos' `AGENTS.md` and `DESIGN.md`, the app's
`src/server/catalogue.ts`, and the service's
`contracts/catalogue-v1.schema.json` and `contracts/examples/`.

**Prompt:** Inspect these two Babazon repositories without changing files.
Explain the current request path and the intended HTTP service boundary.
Separate what already works from the missing service-side search/filtering and
app integration. Name the contract decisions that must be settled first.
Do not implement or create additional tasks.

**Expect:** A repo-qualified map of the existing `ProductCatalogue` seam and
unfinished work. The app already has search/filter UI; the service is browse/detail only.

**Decide:** Check the answer against the files. Inspect the models shown beneath
the Fusion response; do not assume every prompt uses multiple models. Use
[GitHub Copilot Benchmarks](https://benchmarks.github.com/) to discuss task
success/cost trade-offs, not to infer the quality or cost of this one response.
See the [HydraFusion background](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/)
and [current Fusion guide](https://docs.github.com/en/copilot/concepts/models/copilot-fusion).

### Frame and review the cross-repo work

Create the parent in the **app repo** using the outcome issue form. Give the
Project this goal: preserve the shopper journey while moving product queries
behind the separately maintained catalogue service. Do not implement yet.

**Use:** Copilot App Plan mode.

**Attach:** Both repos' guidance, the service contract, and the parent issue.

**Prompt:** Plan one Babazon product discovery outcome across these two repos:
implement search and category filtering in the service, then connect the
existing app through its ProductCatalogue interface. Preserve browsing, product
details, combined filters, clear/empty states, and cart/checkout. Keep the
browser API same-origin. Service mode must validate responses, have a bounded
timeout, and show outages without silently returning local seed data. Keep
liveness independent of service readiness, including startup during an outage.
Propose exactly four child issues. Specify each target repository, dependencies,
owned paths, prohibited paths, focused tests, and evidence. Stabilize the
service-owned contract before parallel work. Do not implement.

**Expect:** A reviewed Copilot App Plan with explicit contract/error semantics
and no overlapping ownership across the service and app sessions.

**Decide:** Approve only when a reviewer can assign every file to one child and
the acceptance criteria are observable.

Create the four child issues from the reviewed Plan:

| Child | Repository and boundary | Depends on |
|---|---|---|
| 1. Contract foundation | Service: `contracts/**`, shared contract definitions, and contract tests; no transport or app changes. | None |
| 2. Service queries | Service: catalogue/query routes and API tests; no contract or app changes. | 1 |
| 3. App integration | App: HTTP catalogue adapter, startup/readiness, and focused tests; no service, client-feature, workflow, or infrastructure edits. | 1 |
| 4. Integration evidence | App: two-process browser/contract checks and CI; no new features or contract changes. | 2 and 3 |

Use full `owner/repo#number` references for cross-repo links. Library can hold
supporting context, but the issues and reviewed Plan remain authoritative.

## Expected repository artifacts

- One parent cross-repo outcome issue in the app repo.
- A reviewed Copilot App Plan linked from the parent.
- Four linked child issues with target repositories, dependencies, and path boundaries.
- A recorded Fusion attempt and one Project containing both participant repos.

## Verification

Ask the App to compare the parent issue, reviewed Plan, and children and report
any missing repository, acceptance criterion, dependency, owned path,
prohibited path, or focused test. Verify both repos appear in the Project.
A human reviews the report before implementation starts.

## Recovery

If Fusion High is unavailable, try an available Fusion effort level and record
it. If Fusion or Projects is unavailable, record `capability-unavailable` and
use an instructor demonstration plus explicitly linked repository sessions.
That recovery is not evidence that you used the missing feature. Keep the four
children above and record unresolved contract questions on the parent.

## Stretch

Compare the same read-only task with another available model in a fresh session.
Use file-backed correctness to evaluate it; do not treat one attempt as a benchmark.
