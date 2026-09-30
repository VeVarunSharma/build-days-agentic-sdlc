# Spec Delta

## Purpose

Lets collectors log a customer's promise to pay against a contract and resolve it as kept or broken. A shared Open/Kept/Broken board and a kept-rate summary show which promises succeeded.

## ADDED Requirements

### Requirement: Log a promise to pay

The system SHALL accept a promise to pay containing `contractNumber`, `customerName`, `amount`, `promisedDate`, and `collector`. It SHALL store the promise with a generated `id`, `status` `open`, a `createdAt` timestamp, and a `resolvedAt` of `null`. Text fields SHALL be trimmed and non-empty: `contractNumber` and `collector` at most 64 characters, and `customerName` at most 100 characters. `amount` SHALL be a number greater than 0, at most 1,000,000, with at most two decimal places. `promisedDate` SHALL be a valid `YYYY-MM-DD` calendar date.

#### Scenario: Valid promise is created

- **WHEN** a client submits a valid promise whose date is within the allowed window and whose contract has no open promise
- **THEN** the system responds 201 with the promise, including `id`, the submitted values, `status` `open`, `createdAt`, and `resolvedAt` `null`

#### Scenario: Invalid input is rejected with field details

- **WHEN** a client submits a promise with a missing or blank field, a non-positive amount, an amount with more than two decimal places, or a malformed date
- **THEN** the system responds 400 with error code `VALIDATION`, a human-readable message, and the offending field names, and stores nothing

#### Scenario: Malformed JSON is rejected

- **WHEN** a client sends a request body that is not valid JSON
- **THEN** the system responds 400 with error code `VALIDATION`

### Requirement: Promised date window

The promised date SHALL be between today and 14 days from today inclusive. "Today" is the calendar date of the current instant in the configured time zone, which defaults to UTC.

#### Scenario: Today is accepted

- **WHEN** a client submits a promise dated today
- **THEN** the system creates the promise

#### Scenario: Fourteen days ahead is accepted

- **WHEN** a client submits a promise dated exactly 14 days after today
- **THEN** the system creates the promise

#### Scenario: Past date is rejected

- **WHEN** a client submits a promise dated yesterday
- **THEN** the system responds 400 with error code `VALIDATION` identifying `promisedDate`

#### Scenario: Date beyond the window is rejected

- **WHEN** a client submits a promise dated 15 days after today
- **THEN** the system responds 400 with error code `VALIDATION` identifying `promisedDate`

#### Scenario: Today follows the configured time zone

- **WHEN** the current instant is on 2 January in UTC but still 1 January in the configured time zone
- **THEN** the system treats 1 January as today for validation and for overdue reporting

### Requirement: At most one open promise per contract

A contract SHALL have at most one open promise. Contract numbers SHALL be compared after trimming and without regard to letter case. A promise that is reported as broken because it is overdue SHALL NOT count as open.

#### Scenario: Duplicate open promise is rejected

- **WHEN** a client submits a promise for a contract that already has an open promise
- **THEN** the system responds 409 with error code `OPEN_PROMISE_EXISTS` and stores nothing

#### Scenario: Duplicate detection ignores case and surrounding spaces

- **WHEN** contract `CN-100234` has an open promise and a client submits a promise for ` cn-100234 `
- **THEN** the system responds 409 with error code `OPEN_PROMISE_EXISTS`

#### Scenario: Resolved or overdue promise does not block a new one

- **WHEN** a contract's only earlier promise is kept, broken, or overdue
- **THEN** a new valid promise for that contract is created with status `open`

### Requirement: Overdue open promises are reported as broken

An open promise whose promised date is before today SHALL be reported with `status` `broken` wherever promises are returned or counted, without any client action. Its `resolvedAt` SHALL remain `null`.

#### Scenario: Promise passes its date unresolved

- **WHEN** an open promise's promised date is before today
- **THEN** listing promises reports it with `status` `broken` and `resolvedAt` `null`, and counts it as broken in the summary

#### Scenario: Promise dated today is still open

- **WHEN** an open promise's promised date is today
- **THEN** listing promises reports it with `status` `open`

### Requirement: List promises with a kept-rate summary

The system SHALL return all promises and a summary of `open`, `kept`, and `broken` counts plus `keptRate`. `keptRate` is kept divided by (kept + broken), a number from 0 to 1, or `null` when no promise is resolved.

#### Scenario: Empty list

- **WHEN** no promises exist and a client lists promises
- **THEN** the system responds 200 with an empty `promises` array and summary `{open:0, kept:0, broken:0, keptRate:null}`

#### Scenario: Mixed statuses

- **WHEN** there are 3 kept, 2 broken (including overdue), and 1 open promise
- **THEN** the system responds 200 with summary `{open:1, kept:3, broken:2, keptRate:0.6}`

### Requirement: Resolve an open promise

The system SHALL let a client resolve an open promise with outcome `kept` or `broken`. Resolving sets the status to the outcome and records `resolvedAt`.

#### Scenario: Promise is marked kept

- **WHEN** a client resolves an open promise with outcome `kept`
- **THEN** the system responds 200 with the promise showing `status` `kept` and a `resolvedAt` timestamp

#### Scenario: Promise is marked broken

- **WHEN** a client resolves an open promise with outcome `broken`
- **THEN** the system responds 200 with the promise showing `status` `broken` and a `resolvedAt` timestamp

#### Scenario: Invalid outcome is rejected

- **WHEN** a client resolves a promise with an outcome other than `kept` or `broken`
- **THEN** the system responds 400 with error code `VALIDATION`

#### Scenario: Unknown promise

- **WHEN** a client resolves a promise id that does not exist
- **THEN** the system responds 404 with error code `NOT_FOUND`

#### Scenario: Promise already resolved

- **WHEN** a client resolves a promise that is already kept, broken, or reported broken because it is overdue
- **THEN** the system responds 409 with error code `ALREADY_RESOLVED` and the promise is unchanged

### Requirement: Consistent error envelope

Every API error response SHALL be JSON of the form `{error:{code,message}}`. Validation errors MAY add per-field details. Error responses SHALL NOT expose stack traces or internal error messages.

#### Scenario: Unexpected failure

- **WHEN** an unexpected server error occurs while handling an API request
- **THEN** the system responds 500 with error code `INTERNAL_ERROR` and a generic message

### Requirement: Liveness and readiness

The system SHALL expose a liveness probe that does not depend on storage, and a readiness probe that verifies storage is usable.

#### Scenario: Liveness

- **WHEN** a client requests `/health`
- **THEN** the system responds 200 with `{status:"ok"}`

#### Scenario: Storage is available

- **WHEN** a client requests `/ready` and storage responds to a health check
- **THEN** the system responds 200

#### Scenario: Storage is unavailable

- **WHEN** a client requests `/ready` and the storage health check fails
- **THEN** the system responds 503 with error code `STORAGE_UNAVAILABLE`

### Requirement: Accessible promise capture form

The board SHALL provide a form with visible labels for contract, customer, amount, promised date, and collector. Field errors SHALL appear next to their fields and be announced to assistive technology through a live region. A successful submission SHALL add the promise to the Open column and clear the form.

#### Scenario: Client-side field validation

- **WHEN** a user submits the form with empty required fields
- **THEN** each invalid field shows an inline error, is marked invalid, is linked to its error message, and the errors are announced through a live region without calling the API

#### Scenario: Server rejection is shown

- **WHEN** the API rejects a submission with `OPEN_PROMISE_EXISTS` or `VALIDATION`
- **THEN** the form shows the server message (field-level where the field is known) in the announced error region and keeps the user's input

#### Scenario: Successful capture

- **WHEN** a user submits a valid promise
- **THEN** the new promise appears as a card in the Open column and the form is reset

### Requirement: Status board and kept-rate donut

The board SHALL show Open, Kept, and Broken columns of promise cards. Each card SHALL show contract, customer, amount, promised date, and collector. Open cards SHALL offer Kept and Broken actions whose accessible names identify the contract. A donut chart SHALL show the kept rate, with a text equivalent such as "Kept 3 of 5 (60%)". Status SHALL be conveyed by text and icon as well as colour. Green, amber, and red SHALL be reserved for Kept, Open, and Broken respectively. Keyboard focus order SHALL follow the visual layout: form, then Open, Kept, and Broken columns.

#### Scenario: Populated board

- **WHEN** promises exist in each status
- **THEN** each card appears in the column that matches its reported status, each column heading shows its label and count, and the donut's text equivalent states kept, resolved total, and percentage

#### Scenario: No resolved promises

- **WHEN** no promise has been resolved
- **THEN** the donut's text equivalent states that no promises are resolved yet instead of a percentage

#### Scenario: Resolve from the board

- **WHEN** a user activates the Kept action on an open card
- **THEN** the card moves to the Kept column and the summary and donut update

### Requirement: Loading, empty, and error states

The board SHALL show a loading skeleton while promises load, the message "No promises yet" when none exist, and an error banner with a Retry action when loading fails.

#### Scenario: Loading

- **WHEN** the promise list request is pending
- **THEN** the board shows a loading skeleton marked busy for assistive technology

#### Scenario: Empty board

- **WHEN** the promise list is empty
- **THEN** the board shows "No promises yet"

#### Scenario: Load failure and retry

- **WHEN** the promise list request fails
- **THEN** the board shows an alert banner with a Retry button, and activating Retry reloads the promises

### Requirement: Local run and smoke verification

The application SHALL start its API and client together for local development. The API port SHALL be configurable through `PORT`, and the development client proxy SHALL target that port. A smoke command SHALL check a running server end to end.

#### Scenario: Configurable port

- **WHEN** a developer starts the application with `PORT` set
- **THEN** the API listens on that port and the development client proxies API, health, and readiness requests to it

#### Scenario: Smoke check passes

- **WHEN** the smoke command runs against a healthy running server
- **THEN** it verifies health, readiness, creation of a synthetic promise, rejection of a duplicate open promise with `OPEN_PROMISE_EXISTS`, and resolution as kept, and exits 0. If any step fails, it exits non-zero and names the failing step.
