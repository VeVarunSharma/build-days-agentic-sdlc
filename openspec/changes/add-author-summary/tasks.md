## 1. Shared contract (owner: `src/shared/contracts.ts`, `tests/contracts.test.ts`)

- [x] 1.1 Add `authorSummaryQuerySchema`, `AuthorSummary` type, and `summarizeAuthor` helper
- [x] 1.2 Add deterministic tests for aggregation, zero result, case sensitivity, and validation limits
- [x] 1.3 Run `npx vitest run tests/contracts.test.ts`

## 2. API endpoint (owner: `src/server/app.ts`, `tests/api.test.ts`; depends on 1)

- [x] 2.1 Add `GET /api/author-summary` using the contract and `storage.list()`; map validation errors to `VALIDATION_ERROR`
- [x] 2.2 Add API tests for all spec scenarios including update after create/vote and no internals in the body
- [x] 2.3 Run `npx vitest run tests/api.test.ts`

## 3. React panel (owner: `src/client/*`, `tests/App.test.tsx`; depends on 1, parallel with 2)

- [ ] 3.1 Add fetch helper in `src/client/api.ts` and the panel with labelled input in `App.tsx`; styles in `styles.css`
- [ ] 3.2 Implement loading, empty, success, error states with accessible roles and refetch after name change, post, and vote
- [ ] 3.3 Add UI tests for each panel scenario
- [ ] 3.4 Run `npx vitest run tests/App.test.tsx`

## 4. Evidence and documentation (depends on 2, 3)

- [ ] 4.1 Run `npm run check` and `openspec validate --all`
- [ ] 4.2 Review API response for data minimization and record in the pull request
- [ ] 4.3 Open implementation PR linking the approved spec PR; record each command as passed, failed, or unrun
