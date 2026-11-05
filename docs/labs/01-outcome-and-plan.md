# Lab 1: Frame the outcome

## Outcome

Try Fusion, then review one cross-repo product search and category filtering Plan.

## Prerequisites

Complete [pre-work](../../README.md#pre-work). One Project must contain your app
copy and catalogue-service copy, not just the upstream templates.

## Participant steps

### Try Fusion

**Use:** Copilot Fusion in the Project.

**Attach:** Both repos' `AGENTS.md`/`DESIGN.md`, app `src/server/catalogue.ts`,
and service `contracts/catalogue-v1.schema.json`.

**Prompt:** Map the current and intended request paths across these repos.
Separate working features from unfinished service queries and app integration.
Identify the shared contract decisions. Do not edit files.

**Expect:** A file-backed explanation of the `ProductCatalogue` boundary.

**Decide:** Verify it against the code. Inspect the models used; Fusion does not
always use multiple models. Use the [references](../../README.md#references)
for HydraFusion background and Benchmarks methodology.

### Review the Plan

Create the parent outcome issue in the app repo.

**Use:** Copilot App Plan mode in the Project.

**Attach:** The parent, both repo guides, and the service contract.

**Prompt:** Plan service-side search/filtering and an HTTP catalogue adapter
for the existing app. Follow DESIGN.md: preserve the shopper journey, validate
responses, bound requests, and show outages without local-data fallback.
Propose exactly four repository-qualified children with dependencies, owned
paths, prohibited paths, focused checks, and evidence. Do not implement.

**Expect:** A reviewed Copilot App Plan with stable contracts before parallel work.

**Decide:** Approve only when every file has one owner and success is observable.

| Child | Owns | Depends on |
|---|---|---|
| 1. Contract | Service schemas, types, examples, contract tests; no HTTP behavior changes. | None |
| 2. Service queries | Service routes, query API tests, smoke checks; no contract changes. | 1 |
| 3. App integration | App adapter/configuration, startup/readiness, focused tests; no service or UI feature edits. | 1 |
| 4. Integration | App two-process browser/contract checks and CI; no new features. | 2, 3 |

Use `owner/repo#number` links. Keep the Lab 4 cache-header change for that lab.

## Expected repository artifacts

One parent, the reviewed Plan, four bounded children, and the two starting commits.

## Verification

Check repo identities, ownership, dependencies, and acceptance criteria before implementation.

## Recovery

Record unavailable Fusion/Projects access and use the pre-work fallback.
Do not count a substitute session as use of the missing feature.

## Stretch

Compare the read-only prompt with another model in a fresh session. Judge
file-backed correctness, not one attempt's apparent speed.
