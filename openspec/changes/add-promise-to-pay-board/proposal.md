# Proposal

## Why

Collectors track a customer's promise to pay a contract balance in free-form notes. Nobody can see which promises are still open, which were kept, and which quietly lapsed. The team needs one shared board and a kept-rate signal. This capstone builds that as a small, isolated net-new application. It exercises the repository's spec-driven, test-backed delivery workflow without touching the workshop feedback application.

## What Changes

- Add a net-new application under `capstone/promise-to-pay-board/` with its own package manifest, lockfile, lint, type-check, test, and build configuration.
- Add a JSON API to log a promise to pay, list promises with an Open/Kept/Broken summary and kept rate, and resolve an open promise as kept or broken. Errors use a single envelope, `{error:{code,message}}`.
- Enforce one business rule: a contract has at most one open promise; the promised date is between today and 14 days from today inclusive; and an open promise whose date is before today is reported as broken.
- Add an accessible React board with a labelled capture form, three status columns of cards, Kept/Broken actions, a kept-rate donut with a text equivalent, and loading, empty, error, and field-validation states.
- Add a storage boundary with an in-memory default adapter and an injectable clock, so date logic is deterministic under test.
- Add liveness (`/health`) and storage-aware readiness (`/ready`) endpoints.
- Add focused unit, API, and UI tests, an `npm run smoke` script against a running server, and a script that captures evidence screenshots.
- Add the capstone-scoped CI workflow `.github/workflows/capstone-promise-to-pay-board-ci.yml`.
- Exclude `capstone/**` from the root ESLint and Vitest configurations, so root validation stays scoped to the workshop application. These two one-line exclusions are the only root configuration changes.

## Capabilities

### New Capabilities

- `promise-to-pay-board`: Log, list, summarize, and resolve customer promises to pay against contracts, with the date-window, single-open-promise, and automatic-broken rules, an accessible board UI, and health/readiness probes.

### Modified Capabilities

None.

## Impact

- **Application:** new, self-contained code under `capstone/promise-to-pay-board/` (TypeScript, Express, React, Vite). `src/`, `tests/`, and the AssetDev and InfinityAsset applications are unchanged.
- **Root configuration:** `eslint.config.js` ignores and `vitest.config.ts` exclude gain `capstone/**`. Root `npm run check` behaviour for the workshop application is otherwise unchanged.
- **Dependencies:** the capstone manifest reuses the reference stack (express, express-rate-limit, react, react-dom, zod, vite, vitest, Testing Library, supertest, tsx, eslint). Playwright is added as a capstone-only dev dependency for evidence screenshots. The root manifest is unchanged.
- **Workflows:** one new, path-filtered, read-only CI workflow. Existing workflows are unchanged.
- **Security/privacy:** no authentication (non-goal), no secrets, synthetic contract numbers and names only, request-size and rate limits on the API.
- **Non-goals:** authentication, cloud deployment and Azure infrastructure, payment integration, and history or analytics beyond the kept-rate summary. The capstone lab's AVM/OIDC deployment, GH-AW, and defect loop are deferred to follow-up changes.
