## 1. Shared API and storage ordering

- [ ] 1.1 Add the supported sort type/validation to the shared contract and
  define the API query contract, including omitted, empty, unsupported, and
  repeated values. Own `src/shared/contracts.ts` and
  `src/server/app.ts`.
- [ ] 1.2 Apply the deterministic `newest` and `most-votes` comparators to both
  storage adapters. Own `src/server/storage.ts`.
- [ ] 1.3 Add fixed-data coverage for defaults, both modes, tie-breakers,
  malformed query shapes, and ordering after a successful vote. Own
  `tests/api.test.ts` and `tests/storage.test.ts`.
- [ ] 1.4 Validate the backend task with
  `npm test -- tests/api.test.ts tests/storage.test.ts` and
  `npm run typecheck`.

## 2. Accessible board sort control

- [ ] 2.1 Add a labeled, keyboard-operable sort control that starts in `newest`,
  requests the selected mode, and does not persist selection across reloads.
  Own `src/client/App.tsx` and `src/client/api.ts`.
- [ ] 2.2 After successful creation or voting, refetch using the active sort
  query and replace the list only on success. On refresh failure, preserve the
  last successful list and report mutation success separately from stale board
  state. Own `src/client/App.tsx` and `src/client/api.ts`.
- [ ] 2.3 Ensure only the latest overlapping sort request can change displayed
  results or active selection. On non-default sort `VALIDATION_ERROR`, announce
  the issue and retry once with `newest`; do not loop if the default is rejected.
  Own `src/client/App.tsx` and `src/client/api.ts`.
- [ ] 2.4 Add UI tests for accessible selection and announcements, request
  values, both ordering modes, create/vote refreshes and vote-driven order
  announcements, out-of-order responses, refresh default, invalid-sort
  fallback, and ordinary/mutation refresh failures. Own `tests/App.test.tsx`.
- [ ] 2.5 Validate the UI task with `npm test -- tests/App.test.tsx` and
  `npm run typecheck`.

## 3. Integration verification

- [ ] 3.1 Confirm every scenario in `specs/feedback-sorting/spec.md` is covered
  by focused API, storage, or UI validation; retain the existing loading,
  empty, and retry behaviors.
- [ ] 3.2 Run `openspec validate --all`, `npm run check`, and
  `git --no-pager diff --check`; report actual results without claiming
  unavailable checks passed.
- [ ] 3.3 Update feature documentation only if needed to explain behavior not
  already captured by the brief and this specification.

## Dependencies

- Task 1 establishes the API and storage behavior before Task 2 integrates the
  client against it.
- Tasks 1 and 2 have non-overlapping primary file ownership and focused tests.
- Task 3 depends on both implementation tasks.
