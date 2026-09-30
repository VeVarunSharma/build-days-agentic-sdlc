# Proposal

## Why

Workshop participants need to switch the feedback board between recently added ideas and ideas receiving the most votes. The current board always lists newest feedback first, so popular ideas can be difficult to find during a workshop.

## What Changes

- Add a visible, accessible sort control with **Newest first** and **Most votes first** modes; newest remains the default.
- Support the selected ordering in the feedback API and apply deterministic tie-breakers so refreshes return a stable order.
- Reorder the board after voting and preserve the selected mode while the page remains open.
- Reject unsupported API sort values with a clear validation response.

Out of scope: arbitrary sort fields, drag-and-drop ordering, personalized or persisted preferences, pagination, and infrastructure changes.

## Capabilities

### New Capabilities

- `feedback-board-sorting`: Selectable newest-first and most-voted-first feedback ordering with deterministic tie handling.

### Modified Capabilities

None. The project currently has no published capability specs.

## Impact

- **Application:** Shared TypeScript contracts, feedback storage ordering, Express list endpoint, client API, and React board.
- **Tests:** Contract, storage, API, and UI tests for order, tie-breakers, invalid values, voting, and refresh behavior.
- **Infrastructure and dependencies:** No changes.
- **Workflows and security:** No workflow or security-policy changes; API input validation is covered by the feature.
- **Documentation:** Update the feature brief or relevant participant documentation only if implementation details change its stated behavior.
