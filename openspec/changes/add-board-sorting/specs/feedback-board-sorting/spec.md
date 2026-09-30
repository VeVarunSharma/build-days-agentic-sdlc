# Spec Delta

## Purpose

This capability lets workshop participants choose how feedback ideas are ordered on the board, so they can review either recent contributions or the ideas receiving the most support.

## ADDED Requirements

### Requirement: Participants can choose a feedback ordering
The feedback board SHALL provide an accessible control for choosing **Newest first** or **Most votes first**. The default selection SHALL be **Newest first**, and the selected mode SHALL remain active while board data is reloaded during the current page visit.

#### Scenario: Newest first is the default
- **WHEN** a participant opens the feedback board without choosing a sort mode
- **THEN** the board shows feedback in newest-first order and the control identifies **Newest first** as selected

#### Scenario: Participant selects most votes first
- **WHEN** a participant selects **Most votes first**
- **THEN** the board shows feedback ordered by descending vote count and the control identifies **Most votes first** as selected

#### Scenario: Sort control is accessible
- **WHEN** a participant navigates the sort control using assistive technology or a keyboard
- **THEN** its purpose, available modes, and selected mode are programmatically available and both modes can be selected

### Requirement: Feedback ordering is deterministic
The feedback list SHALL order **Newest first** by descending creation time, breaking equal creation times by ascending feedback ID. It SHALL order **Most votes first** by descending vote count, then descending creation time, then ascending feedback ID.

#### Scenario: Newest-first ties have a stable order
- **WHEN** multiple feedback items have the same creation time
- **THEN** those items appear in ascending feedback ID order in **Newest first** mode

#### Scenario: Most-voted ties have stable secondary ordering
- **WHEN** multiple feedback items have the same vote count
- **THEN** newer items appear first, and items with equal vote count and creation time appear in ascending feedback ID order

### Requirement: API sort input is validated
The feedback list API SHALL accept exactly `newest-first` and `most-votes-first` as `sort` query values and SHALL use `newest-first` when the parameter is omitted. An empty parameter, repeated parameter, or any other value SHALL return HTTP 400 with the standard validation error envelope, code `VALIDATION_ERROR`, and a `fieldErrors.sort` entry. Invalid values SHALL NOT silently select a fallback mode.

#### Scenario: API defaults when sort is omitted
- **WHEN** a client requests the feedback list without a sort parameter
- **THEN** the API returns items in **Newest first** order

#### Scenario: API returns the requested ordering
- **WHEN** a client requests the feedback list with `sort=newest-first` or `sort=most-votes-first`
- **THEN** the API returns items in that mode's specified deterministic order

#### Scenario: API rejects an empty sort value
- **WHEN** a client requests the feedback list with `?sort` or `?sort=`
- **THEN** the API returns HTTP 400 with code `VALIDATION_ERROR` and a `fieldErrors.sort` entry

#### Scenario: API rejects repeated sort values
- **WHEN** a client requests the feedback list with more than one `sort` query value
- **THEN** the API returns HTTP 400 with code `VALIDATION_ERROR` and a `fieldErrors.sort` entry

#### Scenario: API rejects an unknown sort value
- **WHEN** a client requests the feedback list with any `sort` value other than `newest-first` or `most-votes-first`
- **THEN** the API returns HTTP 400 with code `VALIDATION_ERROR` and a `fieldErrors.sort` entry, without returning a list in a fallback mode

### Requirement: Board updates retain the selected ordering
When feedback is created, voted on, or reloaded during a page visit, the board SHALL display the current data in the participant's selected ordering without resetting the selected mode. During a sort request, the board SHALL retain the previously displayed items and expose a busy state. If multiple sort requests are in flight, only the most recently requested mode's response SHALL update the board. If the most recent sort request fails, the board SHALL retain the previous items, revert the selector to the most recently successfully loaded mode, and announce an accessible error.

#### Scenario: A vote changes most-voted order
- **WHEN** a participant votes for an item while **Most votes first** is selected
- **THEN** the displayed vote count updates and the board reflects the resulting most-voted order

#### Scenario: New feedback is placed in the selected order
- **WHEN** feedback is created while either sort mode is selected
- **THEN** the new item appears at the position required by that mode's ordering rules

#### Scenario: Reload retains the current page selection
- **WHEN** the board reloads its data during the current page visit after a participant selected a mode
- **THEN** the selected mode remains selected and the reloaded items use that ordering

#### Scenario: Most recent rapid mode change wins
- **WHEN** a participant selects another mode before the preceding sort request completes and the responses arrive out of order
- **THEN** the board displays results for the most recently requested mode, keeps that mode selected, and ignores the stale response

#### Scenario: Failed sort request preserves the last successful board state
- **WHEN** the request for a newly selected sort mode fails
- **THEN** the board retains the items in the most recently successfully loaded order, reverts the selector to that mode, and announces an accessible error
