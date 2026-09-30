# Design

## Context

See `proposal.md` - Why. The feedback board already stores each `Feedback`
item with `displayName` and a `votes` count (`src/shared/contracts.ts`,
`src/server/storage.ts`). Two storage backends implement `FeedbackStorage`:
`InMemoryFeedbackStorage` (tests) and `AzureTableFeedbackStorage` (deployed,
authenticated via managed identity). Per root `DESIGN.md`, dependency
direction is inward (UI → shared contracts → storage interface → adapters),
and any new capability must go through the storage interface rather than
querying Azure Table Storage directly from the API layer.

## Goals / Non-Goals

**Goals:**
- Compute the author summary from existing `Feedback` data with no new
  persisted schema, no dual-write consistency concerns, and no migration.
- Keep both storage backends behaviorally identical for the new read path.
- Reuse existing API conventions (`validateBody`, `ApiError`, rate limiting,
  request logging) and existing UI state patterns (loading/empty/error,
  `aria-live`).

**Non-Goals:**
- No authentication, leaderboards, historical analytics, or export (per
  feature brief "Out of scope").
- No new Azure resources, AVM modules, or OIDC changes.
- No pagination or multi-display-name batch summary endpoint.

## Decisions

1. **Aggregation point: storage layer, not route handler.**
   Add `summarizeByDisplayName(displayName: string): Promise<AuthorSummary>`
   to the `FeedbackStorage` interface, implemented by both adapters.
   - *Alternative considered*: aggregate in the Express route by calling
     existing `list()` and filtering in-memory. Rejected because it would let
     the Azure-backed route silently diverge from `InMemoryFeedbackStorage`'s
     semantics over time and duplicates filtering/matching logic; keeping it
     in the interface keeps parity enforced by the shared contract and its
     tests (`tests/storage.test.ts`).
   - Both implementations compute the aggregation by reducing over `list()`
     results filtered by exact trimmed `displayName` match (no new Azure
     Table query pattern, no new partition/row key scheme). This is
     sufficiently fast at workshop data volumes and avoids a second stored
     aggregate that would need to stay consistent with `votes`.

2. **Endpoint: dedicated `GET /api/authors/:displayName/summary`.**
   - *Alternative considered*: a query parameter on `GET /api/feedback`.
     Rejected because it mixes a list-of-items response shape with an
     aggregate response shape, complicating both client typing and API
     tests; a dedicated resource path is more consistent with the "Suggested
     task seams" already split by shared contract / storage / endpoint / UI.

3. **Not-found semantics: `200` with a zero-valued summary; no request-level
   parameter validation.**
   A display name is free text, not an account (feature brief: "Display
   names remain workshop-provided text and are not treated as authenticated
   identities"). Treating "no items yet" as a `404` would conflate "invalid
   request" with "no data yet," and would force the UI to special-case an
   error response as a normal empty state. Returning `{ summary: {
   displayName, itemCount: 0, totalVotes: 0 } }` with `200` lets the UI's
   existing empty-state pattern apply directly.
   - Unlike `POST /api/feedback`, this route applies no `validateBody`-style
     schema to the `:displayName` path parameter. Any string reaching the
     route - empty, whitespace-only, over the stored length limit, or
     containing characters that don't match anything stored - simply fails
     to match on exact-trimmed comparison and falls through to the same
     zero-valued `200` response. This keeps exactly one response path for
     "no data for this name," instead of a second `400` path that would
     require the UI to distinguish "invalid input" from "no items yet" for
     what is, either way, free text with no account backing it.
   - *Alternative considered*: validate the parameter with the same
     trim/1-60-char rule as feedback creation and return `400
     VALIDATION_ERROR` for empty/oversized input. Rejected per explicit
     product decision: a lookup key that doesn't match anything is not a
     malformed request.

4. **Matching: exact, trimmed, case-sensitive.**
   Matches how `displayName` is already stored (trimmed via the existing Zod
   schema, no case transform). Avoids inventing new normalization rules that
   the rest of the app does not apply to `displayName` elsewhere.

5. **Response shape: `summary` envelope, normalized name, no identifiers.**
   The response is `{ summary: { displayName, itemCount, totalVotes } }`,
   matching the existing `{ items }` / `{ feedback }` envelope convention
   used by `GET /api/feedback` and `POST /api/feedback` rather than a bare
   object. `summary.displayName` echoes the normalized (trimmed) value, not
   the raw requested string - this gives the UI a canonical name to render
   after a lookup with incidental whitespace. `AuthorSummary` in
   `src/shared/contracts.ts` contains only `displayName`, `itemCount`, and
   `totalVotes` - no feedback IDs, no vote identifiers (raw or hashed
   `clientId`), no Azure Table partition/row keys. This satisfies the "no
   vote-identity or storage internals" requirement directly at the type
   level, and route/adapter code should not widen it.
   - *Alternative considered*: a bare `{ displayName, itemCount, totalVotes
     }` response with no envelope. Rejected for consistency with the rest
     of the feedback API's response shapes.

6. **Client access: clickable display name plus manual lookup, one shared
   panel.**
   `App.tsx` gains a summary panel/dialog component shared by two triggers:
   a button/link on each feedback card's existing "By {displayName}" text,
   and a standalone lookup input for any display name (including ones with
   no items yet). Both open the same panel, which handles loading,
   zero-valued, success, and error (with retry) states with `aria-live`
   announcements, mirroring the existing board's loading/error pattern.
   - The client's `getAuthorSummary` function MUST `encodeURIComponent` the
     display name when building the request URL. A name containing `/` or
     other reserved characters that is not encoded will simply fail to
     match any stored value (per decision 3, this still returns a
     zero-valued `200`, not an error) rather than break the route.
   - *Alternative considered*: only the clickable-name trigger, no manual
     lookup. Rejected because it would leave no way to check a display name
     with zero items (e.g., "did anyone use this name yet?"), which the
     zero-valued-summary requirement exists to support.

## Risks / Trade-offs

- [Risk] Computing the aggregate via `list()` on every request scales
  linearly with total feedback items → Mitigation: acceptable at workshop
  scale (bounded demo data); if reuse beyond the workshop needs better
  scaling, a follow-up change can introduce a dedicated partition-scoped
  Azure Table query, which is why the aggregation logic is isolated behind
  the `FeedbackStorage` interface rather than inlined in the route.
- [Risk] Display names are not unique identities, so two participants using
  the same free-text name will be aggregated together → Mitigation: this is
  explicitly accepted per the feature brief's scope (display names are
  workshop-provided text, not authenticated identities); documented here so
  it is not mistaken for a defect.
- [Risk] No request-level validation on `:displayName` means arbitrarily
  long or unusual path segments reach the storage lookup → Mitigation: the
  lookup is a read-only exact-trim comparison against existing in-memory or
  Azure Table data with no dynamic query construction from the parameter;
  an unmatched value only ever produces the same zero-valued `200`
  response, never an error, so there is no injection or crash surface
  distinct from the existing `GET /api/feedback` read path.
- No rollback complexity: the change adds a new read-only endpoint and UI
  view with no schema migration or data backfill; removing the route and
  panel fully reverts behavior.

## Durable design impact

None. This does not change the root `DESIGN.md` delivery architecture,
storage interface boundary, or security/deployment decisions - it adds one
read method behind the existing `FeedbackStorage` interface and one endpoint
following existing conventions. No update to root `DESIGN.md` or an
architecture decision record is needed.
