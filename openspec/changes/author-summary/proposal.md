# Proposal

## Why

Workshop facilitators and participants have no lightweight way to see how much
a given display name has contributed to the feedback board (items submitted,
votes received) without exposing per-vote client identities or storage
internals. Issue #5 requests this as a derived, read-only summary. It is
needed now so teams can demonstrate a bounded, observable feature slice
end-to-end (contract → storage → API → UI) using the existing feedback data,
without introducing authentication or new persisted state.

## What Changes

- Add a shared `AuthorSummary` contract (`displayName`, `itemCount`,
  `totalVotes`) computed per `displayName`, matched by exact value after
  trimming (no case-folding), consistent with how `displayName` is already
  validated in `src/shared/contracts.ts`.
- Add a `summarizeByDisplayName` read method to the `FeedbackStorage`
  interface, implemented by both `InMemoryFeedbackStorage` and
  `AzureTableFeedbackStorage` as a computed aggregation over existing
  `Feedback` data (no new persisted schema or storage writes).
- Add an Express endpoint `GET /api/authors/:displayName/summary` that
  applies no request-level validation to the path parameter: any string
  that does not exactly match a stored (trimmed) display name - including
  empty, whitespace-only, or over-limit input - returns `200` with a
  zero-valued summary (`{ summary: { displayName, itemCount: 0, totalVotes:
  0 } }`) rather than a `400`. The response is wrapped in a `summary`
  envelope consistent with the existing `{ items }` / `{ feedback }`
  response conventions, and echoes back the normalized (trimmed) display
  name.
- Add a React summary panel/dialog, shared by two triggers: clicking a
  display name on an existing feedback card, and a separate manual lookup
  input for looking up any display name. Both triggers open the same panel,
  which fetches and displays the summary with loading, zero-summary,
  success, and error (with retry) states, following the existing
  `App.tsx` accessibility patterns (`aria-live`, labeled controls, keyboard
  operability).
- The client fetch function must `encodeURIComponent` the display name when
  building the request URL so names containing spaces or special
  characters route correctly.
- The response must expose no client vote identifiers (hashed or raw) or
  storage internals (e.g., table entity keys).

## Capabilities

### New Capabilities

- `author-summary`: derived, read-only aggregation of feedback item count and
  total votes per workshop display name, exposed via a dedicated API endpoint
  and a UI summary view, without exposing vote-identity or storage internals.

### Modified Capabilities

(none — this introduces a new read-only capability without changing the
requirements of existing feedback submission or voting behavior)

## Impact

- `src/shared/contracts.ts`: new `AuthorSummary` type/schema.
- `src/server/storage.ts`: new `summarizeByDisplayName` method on the
  `FeedbackStorage` interface and both implementations.
- `src/server/app.ts`: new `GET /api/authors/:displayName/summary` route and
  error mapping.
- `src/client/api.ts`, `src/client/App.tsx`: new client fetch function
  (URL-encoding the display name) and a shared UI summary panel/dialog,
  triggered from a clickable display name per feedback card and from a
  manual lookup input, with loading, zero-summary, success, and error
  (with retry) states.
- `tests/`: new/updated tests for storage aggregation, the API endpoint, and
  UI states (`tests/storage.test.ts`, `tests/App.test.tsx`, plus API test
  coverage).
- No infrastructure, AVM, or OIDC changes — the feature reads existing Azure
  Table Storage data through the existing managed-identity-authenticated
  `TableClient`.
