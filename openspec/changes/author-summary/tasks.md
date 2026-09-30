# Tasks

## 1. Shared contract

- [ ] 1.1 Add an `AuthorSummary` type to `src/shared/contracts.ts`,
  containing only `displayName`, `itemCount`, and `totalVotes` (non-negative
  integers); verify with `tests/contracts.test.ts` covering the new type
  shape.

## 2. Storage aggregation

- [ ] 2.1 Add `summarizeByDisplayName(displayName: string):
  Promise<AuthorSummary>` to the `FeedbackStorage` interface in
  `src/server/storage.ts`, and implement it in both
  `InMemoryFeedbackStorage` and `AzureTableFeedbackStorage` by filtering
  `list()` results on exact trimmed `displayName` match and reducing to
  `itemCount`/`totalVotes` (no new persisted field, no new partition/row
  key scheme, no query parameter validation - any non-matching input
  simply reduces to zero). Implement both adapters together in this one
  task since they share the interface and its test file; verify with new
  cases in `tests/storage.test.ts` covering a known name, multiple items by
  the same name aggregated, an unknown name returning zero counts, and an
  empty/whitespace-only/over-limit name also returning zero counts for both
  adapters.

## 3. API endpoint

- [ ] 3.1 Add `GET /api/authors/:displayName/summary` to
  `src/server/app.ts` that calls `storage.summarizeByDisplayName` with the
  raw path parameter (no additional validation layer) and returns `200`
  with `{ summary: { displayName, itemCount, totalVotes } }`, where
  `summary.displayName` is the normalized (trimmed) matched value for a hit
  or the trimmed requested value for a zero-valued result; never returns
  `400`/`404` for this route, and never includes feedback IDs, vote
  identifiers, or storage keys in the response; verify with a new case in
  `tests/api.test.ts` (the existing server-side supertest suite for
  `src/server/app.ts`) asserting known-name totals, the zero-valued
  response for an unknown, empty, or over-length name, and the exact
  response envelope shape (no extra keys outside `summary`).

## 4. Client UI

- [ ] 4.1 Add a `getAuthorSummary(displayName)` client function to
  `src/client/api.ts` that `encodeURIComponent`s the display name when
  building the request URL and follows the existing
  `ApiRequestError`/fetch conventions; verify with a new case in
  `tests/App.test.tsx` (not `tests/api.test.ts`, which is the server-side
  supertest suite owned by task 3.1) asserting the mocked `fetch` receives
  the encoded URL for a name with spaces/special characters.
- [ ] 4.2 Add a shared summary panel/dialog component to `src/client/`
  (wired into `App.tsx`) reachable from two triggers: (a) a
  button/link on each feedback card's existing "By {displayName}" text,
  keyboard-operable, and (b) a standalone manual lookup input for any
  display name. The panel presents loading, zero-valued-summary, success,
  and error (with retry) states, each accessibly announced via `aria-live`
  following the existing board pattern; verify with new cases in
  `tests/App.test.tsx` covering: opening the panel from a card's display
  name, opening it via manual lookup, the zero-valued state rendered as a
  normal result (not an error), and the error-with-retry state.

## 5. Evidence and documentation

- [ ] 5.1 Run `npm run check` and record the result as completion evidence
  for this change; confirm all new/updated tests from tasks 1-4 pass.
- [ ] 5.2 Review the `/api/authors/:displayName/summary` response for data
  minimization (no vote identifiers or storage internals) as completion
  evidence, and note the review outcome in the pull request.
- [ ] 5.3 After deployment through the repository's existing deployment
  pipeline (Lab 3), manually exercise the deployed summary endpoint and UI
  panel using non-sensitive workshop display names (e.g., the existing
  seeded "Workshop participant" data), and record the observed request/
  response and UI screenshots as deployed-demonstration evidence in the
  pull request, per the feature brief's completion evidence requirement.
