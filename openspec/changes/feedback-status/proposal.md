# Proposal

## Why

Workshop feedback items have no status. Participants cannot tell new
submissions apart from items the team has already considered or finished,
even though the board already supports creation and voting (issue #4). Adding
a forward-only status lifecycle lets participants track feedback triage
without editing the original submission.

## What Changes

- Add an optional three-value status (`new`, `planned`, `done`) to the shared
  feedback contract. New feedback always starts as `new`.
- Add a storage-level status update operation that enforces forward-only
  transitions (`new` -> `planned` -> `done`), rejects skip/reverse
  transitions and unknown IDs without mutating state, and leaves voting
  behavior and vote counts unchanged.
- Add a `POST /api/feedback/:id/status` endpoint that validates the requested
  status and maps invalid transitions and unknown IDs to actionable error
  responses, following the existing vote-endpoint convention.
- Add a status badge and a single "Advance to `<next status>`" control to the
  React feedback board, with accessible labeling and consistent
  loading/empty/success/error state handling.
- No new authentication or authorization mechanism. The board remains
  unauthenticated and intended only for the trusted workshop environment,
  consistent with the existing voting design; this is documented explicitly
  in this change's `design.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `feedback-application`: adds a feedback status lifecycle requirement
  (display, forward-only transition, rejection behavior) alongside the
  existing feedback-board, voting, persistence, health, and rate-limit
  requirements.

## Impact

- `src/shared/contracts.ts`: new status enum, request schema, and forward
  transition helper; `Feedback` gains a `status` field.
- `src/server/storage.ts`: new `updateStatus` operation on `FeedbackStorage`,
  implemented for both the in-memory and Azure Table adapters, plus a new
  `InvalidStatusTransitionError`.
- `src/server/app.ts`: new endpoint and error-handler mapping.
- `src/client/api.ts`, `src/client/App.tsx`: new client call, status badge,
  and advance control.
- `tests/contracts.test.ts`, `tests/storage.test.ts`, `tests/api.test.ts`,
  `tests/App.test.tsx`: scenario coverage for the new lifecycle.
- No infrastructure, workflow, or `DESIGN.md` changes. Out of scope: custom
  statuses, role-based access control, status history, notifications, bulk
  updates (matches issue #4 and `docs/features/feedback-status.md`).
