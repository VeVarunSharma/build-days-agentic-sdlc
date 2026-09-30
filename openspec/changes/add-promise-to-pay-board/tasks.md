# Tasks

## 1. Scaffold (single owner; integrate first)

- [ ] 1.1 Create `capstone/promise-to-pay-board/` with `package.json` (scripts `dev`, `start`, `build`, `lint`, `typecheck`, `test`, `check`, `smoke`, `evidence:screenshots`), its lockfile, tsconfigs, and ESLint, Vite (proxy reads `PORT`, dev port `CLIENT_PORT`), and Vitest configs. Verify with `npm ci` and `npm run typecheck` inside the directory.
- [ ] 1.2 Add `src/shared/contracts.ts` with zod request schemas, `PromiseToPay`, `PromiseSummary`, `ApiError`, and error codes. Verify with `npm run typecheck`.
- [ ] 1.3 Add `AGENTS.md` (owned paths, validation commands, guardrails) and `README.md` (run, env vars, smoke, screenshots). Verify the documented commands match `package.json` scripts.
- [ ] 1.4 Add `capstone/**` to root `eslint.config.js` ignores and root `vitest.config.ts` exclude. Verify that root `npm run check` still passes.

## 2. Domain rules and clock

- [ ] 2.1 Implement `src/domain/clock.ts` (`Clock`, `systemClock`, `fixedClock`, `calendarDate` with IANA zone validation). Verify with `tests/unit/clock.test.ts`, which covers a UTC and `America/Los_Angeles` date disagreement and rejection of an invalid zone.
- [ ] 2.2 Implement `src/domain/rules.ts` (window today..today+14 inclusive, `effectiveStatus`, `toView`, `hasOpenPromise` with trimmed case-insensitive contracts, `summarize` with `keptRate` null handling). Verify with `tests/unit/rules.test.ts`, which covers every boundary (yesterday, today, +14, +15), overdue → broken, today still open, the duplicate/overdue interplay, and the 3/2/1 → 0.6 summary.

## 3. Storage

- [ ] 3.1 Implement `PromiseStorage` and `InMemoryPromiseStorage` (`create`, `list`, `get`, `update`, `checkHealth`) returning copies, so callers cannot mutate stored state. Verify with `tests/unit/storage.test.ts`.

## 4. API and health

- [ ] 4.1 Implement `createApp` with `POST /api/promises`, `GET /api/promises`, and `POST /api/promises/:id/resolve`, error-envelope mapping (`VALIDATION`, `OPEN_PROMISE_EXISTS`, `NOT_FOUND`, `ALREADY_RESOLVED`, `INTERNAL_ERROR`), JSON size and rate limits, and static client serving. Verify with `tests/api/promises.test.ts`, which covers every endpoint and every error code, including malformed JSON and the overdue resolve.
- [ ] 4.2 Implement `/health` and `/ready` (503 `STORAGE_UNAVAILABLE` on storage failure) and `src/server/index.ts` env config (`PORT` default 3100, `APP_TIME_ZONE` default UTC). Verify with `tests/api/health.test.ts`.

## 5. Accessible UI

- [ ] 5.1 Implement `api.ts`, `App`, `PromiseForm` (labelled fields, client validation, `aria-invalid`/`aria-describedby`, and an `aria-live` region for field and server errors). Verify with UI tests for empty-field validation without an API call, the server `OPEN_PROMISE_EXISTS` message, and a successful capture.
- [ ] 5.2 Implement `Board`, `PromiseCard` (icon + text status, Kept/Broken buttons with contract-specific accessible names), `KeptRateDonut` (SVG `role="img"` + visible text equivalent), loading skeleton (`aria-busy`), "No promises yet", error banner with Retry, and a calm neutral palette. Verify with UI tests for board rendering by column, donut text ("Kept 3 of 5 (60%)" and the no-resolved text), resolve moving a card, and the loading, empty, and error+retry states.

## 6. Scripts

- [ ] 6.1 Add `scripts/dev.mjs` (API + Vite, shared `PORT`). Verify manually that `PORT=3200 npm run dev` serves the client, and that `/health` through the Vite proxy returns `{status:"ok"}`.
- [ ] 6.2 Add `scripts/smoke.mjs` (health, ready, create, duplicate rejected, resolve kept, named PASS/FAIL, non-zero exit on failure). Verify that `npm run smoke` against `npm start` prints all PASS lines and exits 0.
- [ ] 6.3 Add `scripts/screenshots.ts` using Playwright. Verify that `npm run evidence:screenshots` writes `evidence/board-populated.png`, `evidence/board-empty.png`, and `evidence/duplicate-error.png`.

## 7. CI

- [ ] 7.1 Add `.github/workflows/capstone-promise-to-pay-board-ci.yml` (path-filtered, `contents: read`, `npm ci`, `npm run check`, start the server, `npm run smoke`, upload the log on failure). Verify with a green run on the implementation PR.

## 8. Integration evidence

- [ ] 8.1 Run capstone `npm run check`, `npm run smoke`, and `npm run evidence:screenshots`, plus root `npm run check` and `openspec validate --all`. Record the outputs, the rule test names, and the screenshots in the implementation PR's evidence table.
