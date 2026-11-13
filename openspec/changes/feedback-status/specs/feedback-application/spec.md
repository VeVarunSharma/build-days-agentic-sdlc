## MODIFIED Requirements

### Requirement: Feedback board

The application SHALL let a workshop user view and submit feedback with a
title, description, category, and display name, and SHALL display each
item's status.

#### Scenario: User submits valid feedback

- **WHEN** the user submits all required fields with valid values
- **THEN** the feedback is persisted and appears in the board with its
  creation time, zero votes, and a status of `new`

#### Scenario: User submits invalid feedback

- **WHEN** the user omits a required field or exceeds a documented field
  limit
- **THEN** the application rejects the request and shows an actionable
  validation message without persisting the feedback

### Requirement: Feedback status lifecycle

The application SHALL support exactly three feedback statuses — `new`,
`planned`, and `done` — SHALL start every new feedback item at `new`, and
SHALL allow status to move only forward through `new` -> `planned` ->
`done`. The application SHALL NOT require production authentication for
status updates in this workshop sample; document any workshop-only update
mechanism used.

#### Scenario: Newly created item starts new

- **WHEN** a workshop user creates a feedback item
- **THEN** the returned and displayed item has status `new`

#### Scenario: Valid forward transition persists

- **WHEN** a workshop user advances an item from `new` to `planned`, or from
  `planned` to `done`
- **THEN** the updated status is persisted and remains visible after the
  board is refreshed or reloaded

#### Scenario: Skipping a transition is rejected

- **WHEN** a workshop user attempts to move an item directly from `new` to
  `done`
- **THEN** the application rejects the request with an actionable response
  and the item's stored status remains unchanged

#### Scenario: Reversing a transition is rejected

- **WHEN** a workshop user attempts to move an item from `planned` back to
  `new`, or from `done` back to `planned`
- **THEN** the application rejects the request with an actionable response
  and the item's stored status remains unchanged

#### Scenario: Unsupported status value is rejected

- **WHEN** a status update request specifies a value other than `new`,
  `planned`, or `done`
- **THEN** the application rejects the request without mutating any stored
  feedback

#### Scenario: Unknown feedback identifier is rejected

- **WHEN** a status update request references a feedback identifier that
  does not exist
- **THEN** the application rejects the request without creating or mutating
  any stored feedback

#### Scenario: Voting is unaffected by status updates

- **WHEN** a feedback item's status is updated
- **THEN** its vote count and prior votes remain unchanged, and voting for
  that item continues to work as before

#### Scenario: Status controls remain accessible

- **WHEN** a workshop user views or operates the status display and advance
  control
- **THEN** the status label and control are programmatically accessible,
  and loading, empty, success, and error states remain usable
