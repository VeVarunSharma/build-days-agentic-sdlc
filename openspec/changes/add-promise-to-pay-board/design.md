# Design

## Context

- The repository hosts the workshop feedback application (`src/`, `tests/`, root manifest). Root `DESIGN.md` requires capstone apps to live under `capstone/<app-name>/`, stay independently identifiable, and leave the feedback application unchanged. It also requires a storage boundary, liveness/readiness, and focused tests.
- Root tooling is broad: `eslint .` and `vitest run` would include any `capstone/**` file. Capstone dependencies are not installed at the root, so root `npm run check` would fail or run capstone tests twice.
- `spec-pr-policy.yml` treats `.github/workflows/**` as governed. The capstone CI workflow therefore needs a merged specification PR for this change before the implementation PR.
- The reference app's patterns (Express 5 + zod validation, React 19 + Vite, Vitest + Testing Library + supertest, express-rate-limit) are proven in this repository and pass CodeQL. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- A self-contained package whose `npm run check` (lint, type-check, test, build) and `npm run smoke` prove every scenario in `specs/promise-to-pay-board/spec.md`.
- Deterministic date logic through an injected clock and a configured time zone.
- Parallelizable implementation with a single owner for shared contracts and manifests.

**Non-Goals:**

- Durable or cloud storage adapters, Azure infrastructure, and deployment workflows.
- Authentication, multi-tenant data, payment integration, audit history.
- GH-AW and the capstone defect loop (follow-up changes).

## Decisions

### D1. Independent package with a narrow root exclusion

`capstone/promise-to-pay-board/` has its own `package.json`, `package-lock.json`, `tsconfig*.json`, `eslint.config.js`, `vite.config.ts`, and `vitest.config.ts`. The root `eslint.config.js` `ignores` and root `vitest.config.ts` `test.exclude` each gain `capstone/**`. The exclude keeps Vitest's default exclusions.

- *Why:* The capstone can be installed, validated, and removed independently, and root `npm run check` stays scoped to the workshop app.
- *Alternatives:* npm workspaces (changes the root manifest and lockfile, which are governed and shared); no root edits (breaks root lint/test); custom test-file suffixes (does not solve ESLint).
- *Recorded exception:* These two root configuration lines, plus the root-level CI workflow file (D9), are the only files outside `capstone/promise-to-pay-board/` apart from this OpenSpec change.

### D2. Layered source layout

```text
capstone/promise-to-pay-board/
  AGENTS.md  README.md  package.json  package-lock.json
  tsconfig.json  tsconfig.server.json  vite.config.ts  vitest.config.ts  eslint.config.js
  index.html
  src/shared/contracts.ts     zod request schemas, PromiseToPay, PromiseSummary, ApiError, error codes
  src/domain/clock.ts         Clock { now(): Date }, systemClock, fixedClock(), calendarDate(instant, timeZone)
  src/domain/rules.ts         addDays, isWithinPromiseWindow, effectiveStatus, toView, hasOpenPromise, summarize
  src/server/storage.ts       PromiseStorage + InMemoryPromiseStorage + StorageUnavailableError
  src/server/app.ts           createApp({ storage, clock, timeZone, staticDirectory? })
  src/server/index.ts         env config (PORT default 3100, APP_TIME_ZONE default UTC), listen
  src/client/                 main.tsx, App.tsx, api.ts, components/*, styles.css
  scripts/dev.mjs  scripts/smoke.mjs  scripts/screenshots.ts
  tests/unit/  tests/api/  tests/ui/  tests/setup.ts
  evidence/                   committed screenshots
```

Dependencies point inward: client → shared; server → domain → shared; domain has no Express, React, or storage imports.

### D3. Broken is derived at read time

Storage keeps whatever status was last written (`open`, `kept`, `broken`). A pure `effectiveStatus(promise, today)` returns `broken` when the stored status is `open` and `promisedDate < today` (ISO date string comparison). Every response and the summary use the view produced by `toView`, and `resolvedAt` stays `null`. The duplicate check and resolve guard use the effective status, so an overdue promise does not block a new promise and resolving it returns `ALREADY_RESOLVED`.

- *Why:* No background job or write-on-read. The rule is a pure function and easy to unit-test. Reads never mutate storage.
- *Alternatives:* lazy persistence on each request (mutating reads, harder concurrency); a timer sweep (non-deterministic under test).
- *Trade-off:* A persisted `open` record can disagree with its reported status. This is acceptable because storage is internal and every exposed path goes through `toView`.

### D4. Clock and time zone

`Clock.now()` returns an instant. `calendarDate(instant, timeZone)` uses `Intl.DateTimeFormat('en-CA', { timeZone })` to produce `YYYY-MM-DD`. `APP_TIME_ZONE` (default `UTC`) is validated at startup, and an invalid zone fails fast. Window checks compare ISO strings against `today` and `addDays(today, 14)`, computed with UTC date arithmetic on the calendar date.

- *Alternatives:* always UTC (rejects same-day promises for evening collectors west of UTC); server-local zone (varies by host, which is non-deterministic in CI).

### D5. Validation and error mapping

zod schemas trim text, enforce lengths, reject non-finite, non-positive, over-limit, or more-than-two-decimal amounts (`Math.round(a*100) === a*100`), and require a real `YYYY-MM-DD` date. A zod failure returns 400 `VALIDATION` with `fieldErrors`, as does a date outside the window (`fieldErrors.promisedDate`). Malformed JSON returns 400 `VALIDATION`. Order for resolve: validate the body (400), then look up the promise (404), then check the effective status (409). Unknown errors are logged and return 500 `INTERNAL_ERROR`. Rate limiting (120/min, `/health` exempt) and a 16 kB JSON limit match the reference app's CodeQL-clean posture.

### D6. Duplicate check without races

`InMemoryPromiseStorage.create` is synchronous inside the async API. The API's check-then-create happens without an intervening `await` on another request's write path, so the check is atomic in a single Node process. Contract comparison uses `trim().toUpperCase()`. A future durable adapter must enforce the same invariant (noted for follow-up; out of scope).

### D7. Readiness

`PromiseStorage.checkHealth()` resolves for the in-memory adapter. Tests inject a failing storage to prove 503 `STORAGE_UNAVAILABLE`. `/health` never touches storage.

### D8. Accessible UI with no chart library

- The form uses `<label for>` on every input, `aria-invalid`, and `aria-describedby` pointing to an inline error. A polite `aria-live` region summarises errors, and server errors go to the matching field or the form-level message.
- The board is a `<section>` per column with an `<h2>` label and count, and a list of cards (`<ul>`/`<li>` with `<article>`). Each status has an icon (⏳ Open, ✓ Kept, ✕ Broken, `aria-hidden`) plus a text badge, so colour is never the only signal.
- Buttons read "Mark CN-100234 kept" and "Mark CN-100234 broken" (visible text "Kept" / "Broken" with `aria-label`).
- DOM order is header, donut summary, form, Open, Kept, Broken, which matches the CSS grid visual order (no `order`/positive `tabindex`).
- The donut is an inline SVG with two `circle` strokes (`stroke-dasharray`), `role="img"`, and an `aria-label` equal to the visible caption "Kept 3 of 5 (60%)" or "No resolved promises yet".
- States: skeleton cards with `aria-busy="true"`, "No promises yet", and a `role="alert"` banner with a Retry button.
- Palette: neutral greys and white surfaces. Green `#1f7a4d`, amber `#9a6700`, and red `#b42318` appear only on status badges, column accents, and donut segments. All pass 4.5:1 contrast on white for text.

### D9. Scripts and CI

- `npm run dev` runs `scripts/dev.mjs`, which spawns `tsx watch src/server/index.ts` and `vite` with the shared env. It forwards signals and exits if either child exits. `vite.config.ts` reads `PORT` (default 3100) for the proxy target and `CLIENT_PORT` (default 5174) for the dev server.
- `npm start` runs the built server, which serves `dist/client`.
- `npm run smoke` runs `scripts/smoke.mjs` using Node's global `fetch` against `SMOKE_BASE_URL` (default `http://localhost:${PORT ?? 3100}`). It uses a unique synthetic contract `CN-SMOKE-<epoch>` and today's date from the server's own validation window. It prints `PASS <step>` / `FAIL <step>: <reason>` and exits non-zero on failure.
- `npm run evidence:screenshots` builds and starts the server on an ephemeral port, drives Chromium with Playwright, and writes `evidence/board-populated.png`, `evidence/board-empty.png`, and `evidence/duplicate-error.png`. It is local only; CI does not install browsers.
- `.github/workflows/capstone-promise-to-pay-board-ci.yml` triggers on pull_request/push to `main` with paths `capstone/promise-to-pay-board/**` and the workflow file itself, plus `workflow_dispatch`. It uses `permissions: contents: read`, `defaults.run.working-directory`, Node 20.19 with npm cache keyed on the capstone lockfile, `npm ci`, `npm run check`, then `npm start` and `npm run smoke`, and uploads the server log on failure. Official actions are pinned to stable major versions, matching `ci.yml`.

### D10. Task ownership for parallel work

| Task group | Owned paths |
|---|---|
| 1 Scaffold (single owner, first) | package/tool configs, `src/shared/`, `AGENTS.md`, `README.md`, root exclusion lines |
| 2 Domain | `src/domain/`, `tests/unit/` |
| 3 Storage | `src/server/storage.ts`, `tests/unit/storage.test.ts` |
| 4 API | `src/server/app.ts`, `src/server/index.ts`, `tests/api/` |
| 5 UI | `src/client/`, `index.html`, `tests/ui/`, `tests/setup.ts` |
| 6 Scripts | `scripts/` |
| 7 CI | `.github/workflows/capstone-promise-to-pay-board-ci.yml` |

Groups 2, 3, 5, and 6 can run in parallel after group 1. Group 4 depends on groups 2 and 3, group 7 on groups 4 and 6, and evidence on everything.

## Risks / Trade-offs

- [Root exclusion hides capstone files from root checks] → The capstone has its own `npm run check` and CI workflow, and both are required evidence.
- [Time zone edge cases around DST] → Rules operate on calendar dates only. Unit tests cover an instant where UTC and `America/Los_Angeles` disagree on the date.
- [In-memory storage loses data on restart] → Accepted: durable storage is a non-goal. The `PromiseStorage` interface is the extension point.
- [Smoke run on a long-lived server leaves data] → The unique contract number per run avoids false duplicates.
- [Playwright download size] → Dev-only dependency. Browsers are installed on demand (`npx playwright install chromium`) and are not needed by CI.
- [Spec-PR policy gating] → The spec PR merges before the implementation PR, which links it as `Specification PR: #N`.

## Migration Plan

This is a new application with no data migration. Rollback: revert the implementation PR, which deletes `capstone/promise-to-pay-board/`, the CI workflow, and the two root exclusion lines. The workshop application is unaffected either way.

## Open Questions

None. Durable storage and deployment are explicitly deferred follow-ups.
