# Design

## Context

The feedback board (from `build-deployable-workshop`) supports creation,
listing, and voting through `FeedbackStorage` (in-memory and Azure Table
adapters), an Express API, and a React client. Issue #4 asks for a
forward-only three-state status lifecycle that is visible on the board,
persists, rejects invalid transitions and unknown IDs without mutating data,
and leaves voting untouched. `docs/features/feedback-status.md` frames this
as a comparable-scope participant feature with suggested task seams. This
design extends the existing `feedback-application` capability rather than
introducing a new one, since it operates on the same `Feedback` entity and
API surface.

## Goals / Non-Goals

**Goals:**

- Add `status: "new" | "planned" | "done"` to the feedback entity, defaulting
  to `new` for new and pre-existing (unset) records.
- Enforce forward-only transitions at the storage layer so the rule holds
  regardless of entry point.
- Surface a clear, actionable rejection for skip/reverse transitions,
  unsupported status values, and unknown IDs, without partial mutation.
- Keep voting behavior, vote counts, and existing feedback creation/listing
  behavior unchanged.
- Keep the status control accessible and consistent with the existing
  loading/empty/success/error state model in `src/client/App.tsx`.

**Non-Goals:**

- Custom/configurable statuses, role-based access control, status history,
  notifications, or bulk updates (explicitly out of scope per issue #4 and
  the feature brief).
- Any new authentication/authorization system for the workshop sample.
- Infrastructure or workflow changes; this change does not touch
  `infra/` or `.github/workflows/`.

## Decisions

### Extend `feedback-application` rather than add a new capability

Status is a property of the existing feedback entity and reuses the existing
create/list/vote endpoints' request/response shapes. A new capability would
fragment a single entity's requirements across two specs for no benefit.

### Model status as a required field on `Feedback`, defaulting on read

`status` is typed as a required `FeedbackStatus` on the `Feedback` interface
(not optional), because every code path that returns a `Feedback` — creation,
listing, voting — must return a concrete status for the UI to render
consistently. Storage adapters default any record with no stored status
value (existing seed data, pre-change persisted rows) to `new` when reading,
so no migration or backfill step is required. This keeps the wire contract
simple (`status` is always present) while keeping storage changes additive
and backward-compatible.

### Enforce the transition rule in the storage layer

`FeedbackStorage.updateStatus(id, nextStatus)` is the single place that
validates the current-status -> requested-status transition
(`new -> planned`, `planned -> done` allowed; anything else rejected) before
persisting. This guarantees the invariant holds for both the in-memory test
adapter and the Azure Table adapter, and for any future caller, rather than
relying on the Express layer alone.

A new `InvalidStatusTransitionError` (parallel to the existing
`FeedbackNotFoundError`) signals a rejected transition or unsupported value
at the storage boundary. The existing `FeedbackNotFoundError` continues to
signal an unknown ID. Neither error mutates any stored state before throwing.

### Add `POST /api/feedback/:id/status`

Matches the existing `POST /api/feedback/:id/votes` convention (an action on
a sub-resource) rather than `PATCH`, keeping the API's verb/path style
consistent. Request body: `{ "status": "planned" | "done" }` (validated by a
new Zod schema with the same three-value enum used by the shared contract).
Response: the updated `Feedback`. Error mapping in the Express error handler:

- Unknown ID -> existing `FeedbackNotFoundError` handling -> `404 NOT_FOUND`.
- Skip/reverse transition -> `InvalidStatusTransitionError` ->
  `400 INVALID_TRANSITION` (new `ApiError` code).
- Unsupported status value -> existing Zod validation path ->
  `400 VALIDATION_ERROR` (same mechanism as the existing `validateBody`
  helper).

### No new authentication mechanism (workshop-only update mechanism)

Per the feature brief's requirement to document the chosen workshop-only
update mechanism: this change adds no new auth. The status endpoint is
reachable the same way voting is today — anyone with access to the deployed
board or local dev server can call it. This mirrors the existing design
decision (`DESIGN.md`, "Security and deployment decisions") that the sample
does not implement production authentication, and issue #4 explicitly frames
the board as trusted-workshop-only rather than a production authorization
boundary. If broader exposure is needed later, that requires a separate,
explicitly approved access-control change.

### UI: single "Advance to `<next status>`" button

Mirrors the existing vote button's interaction model (one primary action per
card, disabled/relabeled while in flight) rather than a status dropdown that
would let the client construct invalid transitions the server must then
reject. The button is omitted/disabled once an item is `done`. The status
value itself is shown as a badge (similar to the existing category badge)
so display and action are visually separate.

## Risks / Trade-offs

- Adding a required `status` field to `Feedback` is a wire-contract change;
  any external consumer of the API that assumes `Feedback` has no `status`
  field is unaffected (additive), but consumers matching the type
  structurally in tests must be updated — covered by the task breakdown's
  shared-contract step landing first.
- Enforcing the transition rule only at the storage layer means callers that
  bypass `FeedbackStorage` (none exist today) would not get the guarantee;
  acceptable since `FeedbackStorage` is the sole persistence boundary per
  `DESIGN.md`.
- No new authorization means any board visitor can change status, matching
  the already-accepted risk profile for voting; documented rather than
  silently expanded.

## Migration Plan

No data migration is required. Existing in-memory seed data and any
already-persisted Azure Table rows have no `status` property; both storage
adapters treat a missing stored status as `new` on read. No destructive
schema change occurs.

## Open Questions

None outstanding; endpoint shape and UI control style were confirmed during
planning (see proposal and task breakdown).
