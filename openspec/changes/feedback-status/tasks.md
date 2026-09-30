# Tasks

## 1. Shared status contract and validation

- [ ] 1.1 Add `feedbackStatuses` (`"new" | "planned" | "done"`) and a forward-transition helper to `src/shared/contracts.ts`.
- [ ] 1.2 Add `updateStatusSchema` (Zod enum validation) and add `status: FeedbackStatus` to the `Feedback` interface.
- [ ] 1.3 Add a new `ApiError` code for rejected transitions (`INVALID_TRANSITION`) to the shared error vocabulary/documentation.
- [ ] 1.4 Add `tests/contracts.test.ts` coverage: valid statuses accepted, unsupported values rejected, forward-transition helper accepts `new->planned`/`planned->done` and rejects skip/reverse/same-value transitions.

Validation: `npm run test -- contracts.test.ts`.

## 2. Storage update behavior

- [ ] 2.1 Add `updateStatus(id, nextStatus)` to the `FeedbackStorage` interface and a new `InvalidStatusTransitionError`.
- [ ] 2.2 Implement `updateStatus` in `InMemoryFeedbackStorage`, defaulting any record with no stored status to `new` on read, enforcing the forward-only rule, and leaving votes/other fields untouched.
- [ ] 2.3 Implement `updateStatus` in `AzureTableFeedbackStorage` using the existing entity read/update pattern, same default-to-`new` and forward-only enforcement, and unknown-ID mapping to `FeedbackNotFoundError`.
- [ ] 2.4 Add `tests/storage.test.ts` coverage per scenario: initial `new`, valid forward transition persists, skip rejected, reverse rejected, unknown ID rejected without creating data, vote count unaffected by a status update — for the in-memory adapter (Azure adapter covered by existing adapter-parity test conventions if present).

Validation: `npm run test -- storage.test.ts`.

## 3. Express endpoint and error mapping

- [ ] 3.1 Add `POST /api/feedback/:id/status` route using `validateBody(updateStatusSchema)` and `storage.updateStatus`.
- [ ] 3.2 Map `InvalidStatusTransitionError` to `400 INVALID_TRANSITION` and confirm `FeedbackNotFoundError` continues to map to `404 NOT_FOUND` for this route.
- [ ] 3.3 Add `tests/api.test.ts` coverage: full lifecycle happy path (`new`→`planned`→`done` via successive requests, each persisted and visible in a subsequent `GET /api/feedback`), skip/reverse rejected with unchanged list, unsupported status value rejected, unknown ID rejected without creating data, voting before/after a status update leaves vote counts correct.

Validation: `npm run test -- api.test.ts`.

## 4. React status display/control and accessibility

- [ ] 4.1 Add `advanceFeedbackStatus(id, nextStatus)` to `src/client/api.ts`.
- [ ] 4.2 Add a status badge and a single "Advance to `<next status>`" button per card in `src/client/App.tsx`, disabled/hidden once `done`, with an accessible label (mirroring the existing vote button's `aria-label` pattern) and in-flight/error/success handling consistent with existing state management.
- [ ] 4.3 Add `tests/App.test.tsx` coverage: renders `new` status on a created item, advancing updates the displayed status and shows a success notice, a rejected/error response surfaces an actionable message without losing prior state, and the control has an accessible name/label; confirm existing loading/empty/error-state tests still pass.

Validation: `npm run test -- App.test.tsx`.

## 5. Evidence and documentation

- [ ] 5.1 Run the full focused suite and `npm run check`; capture results.
- [ ] 5.2 Confirm `openspec validate --all` passes for this change.
- [ ] 5.3 Update this `tasks.md` checklist to reflect completed work.
- [ ] 5.4 Summarize scenario-to-test mapping and validation results in the implementation pull request description, linked to issue #4.
