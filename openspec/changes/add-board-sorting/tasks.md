# Tasks

## 1. Shared sorting contract and storage

- [x] 1.1 Define the supported sort modes and shared deterministic comparator in the shared layer; verify the contract and comparator tests cover both modes and equal-value tie-breakers.
- [x] 1.2 Update the storage interface and in-memory and Azure Table adapters to list feedback in the requested mode; verify storage tests prove newest-first defaults and exact ordering for both modes.

## 2. API query behavior

- [x] 2.1 Add sort-query parsing, defaulting, and validation to the feedback list endpoint; verify API tests cover omitted values, both supported values, empty values (`?sort` and `?sort=`), repeated values, unknown values, the HTTP 400 `VALIDATION_ERROR` envelope with `fieldErrors.sort`, and deterministic response order.

## 3. Accessible board control and updates

- [ ] 3.1 (Single UI-owned task; one agent owns `src/client/App.tsx` and `tests/App.test.tsx`.) Implement the accessible sort selector, request lifecycle, reload behavior, and selected-order updates after creation and voting; verify UI tests cover the default and both modes, accessible selected state, retained old items and busy state while loading, rapid mode changes with stale responses ignored, failed requests reverting to the last successful mode with an accessible error, and final displayed order matching the active mode.

## 4. Feature evidence

- [ ] 4.1 Run `npm test` and `npm run check`; verify all focused and repository checks pass and link the implementation PR to the approved OpenSpec scenarios.
- [ ] 4.2 Demonstrate both modes against a deployed board with at least three feedback items, including a vote that changes the most-voted order; verify the PR records the observable result and deployment evidence.
