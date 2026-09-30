## Why

Workshop users want a lightweight view of participation for a display name without exposing private profile data. The feedback board has no derived, per-author aggregate today.

## What Changes

- Add a read-only endpoint `GET /api/author-summary?displayName=<name>` returning the number of feedback items and total votes received for that display name.
- Add a small board panel where a user enters a display name and sees the summary with loading, empty, success, and error states.
- Refresh the summary after a name change and after the user posts feedback or votes.
- Add shared contract types and validation for the request and response.

Out of scope: authentication, leaderboards, profile pages, historical analytics, exports, storage schema changes, and infrastructure or workflow changes.

## Capabilities

### New Capabilities

- `author-summary`: Derived per-display-name aggregate of feedback count and total votes, exposed through the API and shown on the board.

### Modified Capabilities

None. Existing feedback, voting, persistence, health, and readiness behavior is preserved.

## Impact

- `src/shared/contracts.ts`: summary query schema, response type, derivation helper.
- `src/server/app.ts`: new route; no change to the `FeedbackStorage` interface (derive from `list()`).
- `src/client/App.tsx`, `src/client/api.ts`, `src/client/styles.css`: summary panel and fetch.
- `tests/`: contract, API, and UI tests.
- No AVM, OIDC, or workflow impact.
