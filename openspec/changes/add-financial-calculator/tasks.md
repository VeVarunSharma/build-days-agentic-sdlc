# Tasks

## 1. Calculation core

- [x] 1.1 Add `src/client/finance.ts` with input/row types, `generateSchedule`, and
  `recalculate` pure functions, including input validation.
- [x] 1.2 Add `tests/finance.test.ts` covering standard amortization, zero rate, balloon,
  deferral, fixed and interest-only recalculation, and invalid-input rejection.
- [x] 1.3 Validation: `node ... vitest run tests/finance.test.ts` passes.

## 2. Calculator UI and navigation

- [x] 2.1 Add `src/client/FinancialCalculator.tsx` with the input form, Generate action,
  editable results grid (per-row type selector and fixed-amount input), and Recalculate action.
- [x] 2.2 Add view navigation in `src/client/App.tsx` and supporting styles in
  `src/client/styles.css`.
- [x] 2.3 Add `tests/FinancialCalculator.test.tsx` covering generate, change a row to
  interest-only and fixed, and recalculate.
- [x] 2.4 Validation: `node ... vitest run tests/FinancialCalculator.test.tsx tests/App.test.tsx`
  passes.

## 3. Full validation

- [x] 3.1 Run `npm run check` (lint, typecheck, test, build) on Node >= 20.19. Lint, typecheck,
  and build pass; all calculator and feedback tests pass. The only failure is the pre-existing
  `tests/workshop-scripts.test.ts`, which requires `bash` (absent here) and is unrelated to this change.

