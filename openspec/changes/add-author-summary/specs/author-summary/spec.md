## ADDED Requirements

### Requirement: Author summary aggregation

The system SHALL return, for a display name, the count of feedback items submitted under that exact trimmed display name and the sum of votes across those items. Matching is case-sensitive.

#### Scenario: Known display name returns totals

- **WHEN** a client requests the summary for a display name that has submitted feedback
- **THEN** the response status is 200 and contains that name's `itemCount` and `totalVotes`

#### Scenario: Multiple items are aggregated

- **WHEN** a display name has submitted several feedback items with differing vote counts
- **THEN** `itemCount` equals the number of items and `totalVotes` equals the sum of their votes

#### Scenario: Unknown display name returns zeros

- **WHEN** a client requests the summary for a display name with no feedback
- **THEN** the response status is 200 with `itemCount` 0 and `totalVotes` 0

#### Scenario: Summary reflects new feedback and votes

- **WHEN** feedback is created or voted on after a summary was previously returned
- **THEN** a subsequent request returns updated totals

#### Scenario: Names differing only by case are distinct

- **WHEN** feedback exists for "Sam" and a client requests the summary for "sam"
- **THEN** the response for "sam" has `itemCount` 0

### Requirement: Summary request validation

The system SHALL require a non-empty `displayName` query parameter of at most 60 characters after trimming and SHALL reject invalid requests with the standard error shape.

#### Scenario: Missing or blank display name

- **WHEN** a client requests the summary with no `displayName` or only whitespace
- **THEN** the response status is 400 with code `VALIDATION_ERROR` and a `displayName` field error

#### Scenario: Overlong display name

- **WHEN** the trimmed `displayName` exceeds 60 characters
- **THEN** the response status is 400 with code `VALIDATION_ERROR`

### Requirement: Summary data minimization

The summary response SHALL contain only `displayName`, `itemCount`, and `totalVotes`.

#### Scenario: No internals exposed

- **WHEN** a client receives a summary response
- **THEN** the body contains no client vote identifiers, feedback identifiers, vote row keys, or storage fields

### Requirement: Accessible summary panel

The board SHALL present a summary panel with a labelled display name input and accessible loading, empty, success, and error states, and SHALL refresh the summary after a name change and after feedback is posted or a vote is recorded.

#### Scenario: Loading and success

- **WHEN** a user enters a display name and the request is pending, then succeeds with items
- **THEN** a status message announces loading, then the item count and total votes are shown

#### Scenario: Empty result

- **WHEN** the response has `itemCount` 0
- **THEN** the panel states that no feedback was found for that name

#### Scenario: Error

- **WHEN** the summary request fails
- **THEN** an alert message is shown and the rest of the board remains usable

#### Scenario: Refresh after activity

- **WHEN** the user posts feedback or votes while a summary is displayed
- **THEN** the panel refetches and shows updated totals
