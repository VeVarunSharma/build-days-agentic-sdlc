# Lab 3: Integrate and prove

## Outcome

Prove the shopper journey works through the service and record both tested commits.

## Prerequisites

Contract, service-query, and app-integration changes are reviewable and pass
focused checks. `CATALOGUE_URL` must now be implemented.

## Participant steps

**Use:** Interactive mode on the integration child, within the Project.

**Attach:** The parent, Plan, child issues, both repos' changes, contract, and CI.

**Prompt:** Integrate only reviewed changes. Verify browse/detail, text/category
and combined filters, clear/empty states, cart, and checkout through the real
service. Cover startup outage, restart/retry, invalid responses, and timeouts.
Keep liveness independent of readiness. Fix integration defects only.

**Expect:** A working two-process path, not proof based only on browser route mocks.

**Decide:** Review evidence against the parent criteria before merging.

Use separate terminals:

```powershell
# Service repo
npm run build
$env:PORT = "3001"
npm start
```

```powershell
# App repo, after adapter implementation
npm run build
$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:CATALOGUE_URL = "http://127.0.0.1:3001"
npm start
```

Open the application page at `http://127.0.0.1:3000`. Stop only the service's own
process, then reload/change a filter to make a new request. An already-loaded
catalogue is not fallback evidence. Expect `/health` 200, `/ready` 503, and a
visible retryable error. Restart the service and verify recovery.

Extend Playwright/CI to start both processes; the original setup starts only
the app. Pin an exact reviewed service SHA in CI. The app's `GITHUB_TOKEN` does
not automatically grant access to a private service repo.

## Expected repository artifacts

Linked changes for all four children, both tested SHAs, and local/browser/CI receipts.

## Verification

Run `npm run check` in both repos. Record commands, results, contract version,
SHAs, and run links. Check `/api/products`, product detail, search/category
queries, and the application page alongside health/readiness.

Azure is optional. The existing [deployment](../../infra/README.md) targets the
standalone app, not the two-service topology.

## Recovery

Recover the last reviewed app/service commit pair, not independently moving branches.

## Stretch

Return a malformed service response and confirm the app rejects it without
corrupting cart state or substituting local data.
