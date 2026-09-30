# Design

## Context

See `proposal.md` for motivation and `specs/feedback-board-sorting/spec.md` for the behavior contract. The existing feedback list API accepts no query parameters, and both storage adapters currently return newest-first lists. The React board keeps fetched items in component state and updates that state after create and vote operations.

The implementation must preserve the existing default list behavior and fit the dependency direction in `DESIGN.md`: the shared layer remains independent of React, Express, and Azure SDK types.

## Goals / Non-Goals

**Goals:**

- Keep a single typed definition of the supported sort modes and ordering rules that can be reused by the API, both storage adapters, and client-side updates.
- Make omitted sort input backward-compatible and reject unsupported query values before listing data.
- Preserve the selected sort mode through list reloads and reorder local updates after creates and votes.
- Keep deterministic results consistent between the in-memory and Azure Table adapters.

**Non-Goals:**

- Persisting a participant's selection across page visits or sharing it through a URL.
- Adding database indexes, schema migrations, pagination, caching, or additional sort modes.
- Changing deployment, identity, workflow, or infrastructure configuration.

## Decisions

1. **Use a shared sort contract and comparator.** Define the two sort modes and deterministic comparator in the shared TypeScript layer, and use them wherever feedback is ordered. This avoids subtly different tie behavior in the two storage adapters and in the UI after a mutation. An alternative is separate comparators in each layer; that is simpler initially but risks inconsistent ordering.

2. **Pass sort mode through the existing list API and storage boundary.** The list endpoint accepts an optional `sort` query parameter, defaults omission to newest-first, validates supplied values, and returns HTTP 400 for unsupported or malformed values. The storage interface receives the validated mode and returns items in that order. This keeps API consumers and both storage implementations aligned. UI-only sorting was rejected because it would leave API ordering unsupported and could not guarantee the same behavior for other clients.

3. **Sort fetched records in the application rather than relying on Azure Table ordering.** Both adapters can retrieve the existing unpaginated feedback set and apply the shared comparator. This avoids Azure-specific query assumptions and new indexes. The workshop's bounded dataset makes the in-memory sort appropriate; if the product later needs large datasets or pagination, ordering and indexing should be revisited.

4. **Keep selection in page state and resort local mutations.** The client requests the selected mode on initial load and on mode changes, retains the selection while reloading data, and applies the shared comparator after create and vote responses update local state. This keeps interaction immediate and does not add a redundant list request after every mutation. Persisting the choice across page visits is deliberately excluded.

5. **Use explicit tie-breakers.** Newest-first compares creation time descending then ID ascending. Most-voted compares vote count descending, creation time descending, then ID ascending. IDs provide a stable final order even when primary values match.

## Risks / Trade-offs

- Sorting all feedback records in memory is appropriate for the current bounded workshop board but scales linearly with its size. → Keep the existing scope unpaginated and revisit storage-side ordering before expanding dataset size.
- The client and API both need the comparator for immediate post-mutation ordering. → Keep one shared comparator and test both API/storage results and UI ordering against tie cases.
- API callers that accidentally supply unsupported sort values will receive a 400 instead of an implicit default. → Keep omission backward-compatible and return the repository-standard actionable validation error.

## Migration Plan

No data migration is required. Existing clients that omit `sort` continue to receive newest-first results. Rollback can remove the sort control and query handling and restore the existing no-argument list behavior; no persisted state or Azure resources need cleanup.

## Open Questions

None.
