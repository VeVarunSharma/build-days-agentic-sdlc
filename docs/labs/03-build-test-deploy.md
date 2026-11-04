# Lab 3: Integrate and prove

## Outcome

Prove the existing shopper journey works through the real catalogue service,
and record the exact pair of commits that passed.

## Prerequisites

- Foundation, service-query, and app-integration children have reviewable pull requests.
- Focused tests pass on each branch.
- The app integration now implements `CATALOGUE_URL`; it is not a starter setting.

## Participant steps

**Use:** Copilot App Interactive mode on the integration child, within the Project.

**Attach:** Parent issue, reviewed Plan, all child issues, pull requests, and
the current CI results from both repositories.

**Prompt:** Integrate the reviewed service and app commits. Resolve only
integration defects. Start both processes and prove the app actually calls the
service rather than local seed data. Verify browsing, details, text search,
category and combined filters, clearing filters, page availability, and
accessible loading, empty, and failure states. Stop the service and verify app
liveness, failed readiness, and a visible retryable error; restart it and verify
recovery. Cover an invalid response and request timeout. Preserve cart and
checkout. Run focused checks before each repo's full check. Record both SHAs.

**Expect:** A clean integration diff, actionable failures, and evidence tied to
both tested commits. A browser route mock alone does not prove service behavior.

**Decide:** Merge only when required checks and human review agree with the
parent acceptance criteria.

For a local rehearsal, use separate terminals in the two participant copies:

```powershell
# Service repo, after its query child is integrated
npm run build
$env:PORT = "3001"
npm start
```

```powershell
# App repo, after its HTTP adapter child is integrated
npm run build
$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:CATALOGUE_URL = "http://127.0.0.1:3001"
npm start
```

Use `http://127.0.0.1:3000` for the application page. Stop only the service's
own terminal/process during the outage check, then restart it. Never kill all
Node processes on a shared machine.
Reload the page or change a filter after stopping the service so the browser
makes a new request. An already-loaded catalogue is not evidence of fallback.

The integration child must extend browser/CI orchestration to start both
processes and exercise the service-backed app. The original Playwright setup
starts only the app. In CI, check out an exact reviewed service SHA and include
it in the result artifact alongside the app SHA. Do not assume the app's
`GITHUB_TOKEN` can read a private service repo; use the approved public workshop
copies or record the access blocker.

## Expected repository artifacts

- Linked pull requests for all four child issues, including both repositories.
- Focused results and passing full checks for the tested commit pair.
- Browser evidence for the shopper journey.
- Optional protected Azure deployment evidence.

## Verification

Ask the Project to run `npm run check` in each repo and inspect CI on each
current pull-request head. Record exact commands, results, both commits,
contract version, process ports, and run/artifact links. Include `/health`,
`/ready`, `/api/products`, product detail, search, category, combined filters,
and the application page.

Azure remains optional advanced work. The existing deployment configuration
deploys the standalone app, not a two-service topology; do not claim it proves
cross-repo deployment. Optional deployment details live in
`../../infra/README.md`.

## Recovery

Recover the last reviewed **pair** of app/service commits on separate recovery
branches. Reapply only reviewed child changes. Do not combine an old app
checkpoint with an arbitrary latest service revision.

## Stretch

Add a contract-drift case: a service response missing a required product field
must produce an explicit app error, not corrupt the cart or show local data.
