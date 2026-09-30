# Feature brief: Board sorting

## User need

Workshop users need to switch between recent feedback and the ideas receiving
the most votes.

## Comparable scope

Add two sort modes:

- newest first;
- most votes first.

The board defaults to **Newest first** and exposes an accessible selector for
both modes. The selection remains active during reloads for the current page
visit. The API accepts `newest-first` and `most-votes-first`; an omitted value
defaults to `newest-first`, while empty, repeated, or unsupported values return
HTTP 400 with a `VALIDATION_ERROR` response and a `fieldErrors.sort` entry.

## Required scenarios

1. Newest-first orders by descending creation time, then ascending feedback ID.
2. Most-voted orders by descending vote count, descending creation time, then
   ascending feedback ID.
3. The selected mode and available options are accessible, and newest-first is
   selected by default.
4. Creating or voting updates the displayed order without resetting the
   selected mode.
5. During a sort request, the current items remain visible and the board
   exposes a busy state. Only the latest request may update the board.
6. A failed sort request retains the prior items, reverts the selector to the
   most recently successful mode, and announces an accessible error.

## Suggested task seams

- shared sort contract and validation;
- deterministic service/storage ordering and tests;
- Express query handling;
- React sort control and accessible state;
- evidence and documentation.

Finalize actual path ownership only after inspecting the repository.

## Completion evidence

- fixed test data proving both modes and tie-breakers;
- UI tests proving selected state, request lifecycle, stale-response handling,
  failure recovery, and mutation ordering;
- pull request linked to the approved scenarios;
- deployed demonstration with at least three feedback items and a vote that
  changes most-voted order (pending integration and deployment).

## Out of scope

Arbitrary fields, drag-and-drop ordering, personalized preferences, pagination,
and infrastructure changes.
