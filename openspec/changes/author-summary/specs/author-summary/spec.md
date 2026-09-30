# Spec Delta

## Purpose

Gives workshop participants and facilitators a read-only, aggregated view of
a display name's feedback board participation (item count and total votes
received) without exposing authenticated identity, client vote identifiers,
or storage internals.

## ADDED Requirements

### Requirement: Retrieve author summary by display name
The system SHALL provide a read-only summary of feedback participation for a
given `displayName`, containing the number of feedback items submitted by
that display name and the total votes received across those items.

#### Scenario: Known display name returns correct totals
- **WHEN** a client requests the summary for a `displayName` that has
  submitted feedback items
- **THEN** the system returns the exact count of items submitted by that
  display name and the sum of votes across those items

#### Scenario: Multiple items by the same display name are aggregated
- **WHEN** a display name has submitted more than one feedback item, each
  with its own vote count
- **THEN** the summary's item count includes every item by that display name
  and the total votes equals the sum of votes across all of them

#### Scenario: Unknown display name returns a zero-valued summary
- **WHEN** a client requests the summary for a `displayName` with no
  submitted feedback items
- **THEN** the system returns a successful response with an item count of
  zero and a total votes of zero, rather than an error

#### Scenario: Any non-matching input returns a zero-valued summary, never an error
- **WHEN** a client requests the summary using a `displayName` value that
  does not exactly match any stored display name after trimming - including
  an empty string, a whitespace-only string, or a string longer than the
  stored display name length limit
- **THEN** the system returns a successful response with an item count of
  zero and a total votes of zero, and does not return a validation error
  for the request

#### Scenario: Summary reflects new feedback and votes
- **WHEN** new feedback is submitted by a display name or an existing item by
  that display name receives a new vote
- **THEN** a subsequent summary request for that display name reflects the
  updated item count and total votes

### Requirement: Display name matching is exact after trimming
The system SHALL match `displayName` values for summary aggregation using an
exact, trimmed comparison, consistent with how `displayName` is validated and
stored for feedback submission. The system SHALL NOT apply case-folding or
fuzzy matching.

#### Scenario: Leading and trailing whitespace is ignored
- **WHEN** a client requests a summary using a `displayName` with leading or
  trailing whitespace that otherwise exactly matches a stored display name
- **THEN** the system returns the summary for the matching stored display
  name

#### Scenario: Differently cased display name does not match
- **WHEN** a client requests a summary using a `displayName` that differs
  only in letter casing from a stored display name
- **THEN** the system treats it as a distinct, unknown display name and
  returns a zero-valued summary

### Requirement: Summary response excludes vote-identity and storage internals
The summary response SHALL expose only the aggregated item count and total
votes for the requested display name, wrapped in a `summary` field
consistent with other feedback API responses. The response SHALL echo back
the normalized (trimmed) display name rather than the raw requested text.
The system SHALL NOT include client vote identifiers (raw or hashed),
individual feedback item identifiers, partition/row key values, or any
other storage-internal fields in the response.

#### Scenario: Response contains only aggregate fields
- **WHEN** a client requests a summary for any display name, known or
  unknown
- **THEN** the response body's `summary` field contains only the
  normalized display name and its aggregated item count and total votes,
  with no per-item identifiers, vote identifiers, or storage-internal
  fields

#### Scenario: Response echoes the normalized display name
- **WHEN** a client requests a summary using a `displayName` with leading
  or trailing whitespace that matches a stored display name after trimming
- **THEN** the response's `summary.displayName` contains the trimmed,
  stored display name rather than the untrimmed requested text

### Requirement: Summary is reachable from both the feedback board and a manual lookup
The system SHALL let a user view an author's summary either by selecting an
existing feedback item's display name, or by submitting a display name
through a separate manual lookup control. Both paths SHALL present the
summary in one shared, keyboard-operable view.

#### Scenario: Selecting a display name on a feedback item opens its summary
- **WHEN** a user activates the display name shown on a feedback item,
  using a pointer or the keyboard
- **THEN** the system opens the shared summary view showing that display
  name's aggregated item count and total votes

#### Scenario: Manual lookup opens the summary for any display name
- **WHEN** a user submits a display name through the manual lookup control
- **THEN** the system opens the shared summary view showing the aggregated
  item count and total votes for that display name, including a
  zero-valued summary when there is no matching data

### Requirement: Summary view communicates loading, result, and failure states accessibly
The shared summary view SHALL present distinct, accessibly announced states
for loading, a returned summary (including zero-valued), and a failed
request, and SHALL let the user retry a failed request.

#### Scenario: Loading state is announced
- **WHEN** a summary request is in progress
- **THEN** the summary view presents a loading state that is announced to
  assistive technology

#### Scenario: Zero-valued summary is presented as a normal result, not an error
- **WHEN** a summary request succeeds with zero items and zero votes
- **THEN** the summary view presents this as a normal, accessibly announced
  result distinct from a failed request

#### Scenario: Failed summary request offers retry
- **WHEN** a summary request fails
- **THEN** the summary view presents an accessibly announced error message
  and a control that lets the user retry the request
