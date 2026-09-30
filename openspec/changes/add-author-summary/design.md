## Context

The API depends on `FeedbackStorage` (`list/create/vote`); votes are stored in separate rows, but `Feedback.votes` is already a maintained counter. Root `DESIGN.md` dependency direction: UI and transport use shared contracts; the API uses the storage interface.

## Decisions

- **Derive from `list()`**: a pure `summarizeAuthor(items, displayName)` in `src/shared/contracts.ts` (no React, Express, or Azure types) keeps logic adapter-independent and deterministically testable. Rejected: a new storage method, which would duplicate logic in both adapters and change the port.
- **Query parameter route**: `GET /api/author-summary?displayName=`. Avoids path-segment encoding problems for names with spaces or `/`. Validated by a zod schema reusing `fieldLimits.displayName`.
- **Unknown name returns 200 with zeros**: no existence oracle and no UI error state for a normal case.
- **Exact trimmed, case-sensitive matching**: display names are workshop text, not identities.
- **Response shape**: `{ displayName, itemCount, totalVotes }` only.
- **Client freshness**: refetch on name change and after successful post or vote; no polling.
- **Scale**: `list()` scans all feedback; acceptable for workshop volumes. Revisit with an index if volume grows.

## Risks / Trade-offs

- Full scan per request is bounded by the existing 120 requests/minute rate limit.
- Display-name free text is not authenticated; the summary is informational only.
- Rollback: remove the route, panel, and helper; no data migration exists.

## Root DESIGN.md

No durable boundary change; `DESIGN.md` is not updated.
