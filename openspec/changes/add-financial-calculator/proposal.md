# Proposal

## Why

The workshop application currently offers only the feedback board. Participants and
instructors want a second, self-contained interactive feature that exercises richer client
behavior — form-driven computation and an editable results grid — without adding backend or
persistence complexity. A loan/amortization **financial calculator** provides that: it is a
well-understood domain, produces deterministic output that is easy to test, and demonstrates a
bounded, parallelizable feature seam.

## What Changes

- Add a **client-only** financial calculator as a new in-app page alongside the feedback board.
- Add a lightweight in-app navigation control to switch between the feedback board and the
  calculator without introducing a new routing dependency.
- Add a pure calculation module that generates an amortization schedule from loan inputs and
  recalculates it after per-row edits.
- Add an editable results grid where each payment row can be set to Normal, Fixed (custom
  amount), or Interest-only, with a Recalculate action that recomputes interest and balance
  forward.
- Add unit tests for the calculation module and UI tests for the calculator page.

## Capabilities

### New Capabilities

- `financial-calculator`: A client-only loan amortization calculator with an editable,
  recalculating payment schedule.

### Modified Capabilities

None.

## Impact

- Adds client source: `src/client/finance.ts` and `src/client/FinancialCalculator.tsx`.
- Modifies `src/client/App.tsx` and `src/client/styles.css` for navigation and styling.
- Adds tests: `tests/finance.test.ts` and `tests/FinancialCalculator.test.tsx`.
- No API, storage, infrastructure, workflow, or dependency changes.
- No impact on existing feedback-board behavior or its tests.

## Non-goals

- No server-side calculation, persistence, or export.
- Recalculation does not re-amortize to force a zero ending balance; the balance floats.
- No multi-currency or tax/fee modeling.
