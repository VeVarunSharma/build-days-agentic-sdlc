# Design

## Context

This change adds a second interactive feature to the existing React/Express workshop app. Per
root `DESIGN.md`, dependency direction is inward and shared contracts must not depend on React.
The calculator is pure presentation plus client-side computation, so it lives entirely in
`src/client` and needs no API, storage, or shared contract changes.

## Goals

- Keep calculation logic in a pure, dependency-free module for deterministic unit testing.
- Keep the existing feedback board unchanged and independently testable.
- Avoid new npm dependencies (guardrail: prefer existing patterns and dependencies).

## Decisions

### Client-only computation

All math runs in the browser. This matches the confirmed scope, keeps the feature deterministic,
and avoids touching the storage interface or Express layer. Trade-off: no server-side reuse of
the schedule, which is acceptable for a workshop calculator.

### No routing dependency

Rather than adding `react-router`, `App.tsx` holds a small `view` state (`"board" | "calculator"`)
rendered behind a nav control. This honors the "prefer existing dependencies" guardrail. Trade-off:
no deep-linkable URLs; acceptable for two views.

### Pure calculation module (`finance.ts`)

Two pure functions:

- `generateSchedule(inputs)` validates inputs and returns the initial schedule rows, each with a
  default type of `"normal"`.
- `recalculate(rows, inputs)` recomputes interest/principal/balance forward, honoring each row's
  `type` (`normal` | `fixed` | `interestOnly`) and `fixedAmount`.

Period rate `i = (annualRate/100) / periodsPerYear`; level payment
`A = P·i / (1 − (1+i)^−N)`, or `P/N` when `i = 0`. Deferral multiplies the scheduled payment by
`(1 − deferralRate/100)` for periods within the deferral window. The balloon is added to the
final row's payment. The ending balance floats.

### Validation

`generateSchedule` throws a typed error for non-positive loan/term, negative rate, or negative
balloon/deferral values. The UI catches it and renders an actionable message, mirroring the
feedback board's error pattern.

## Risks & rollback

- Risk: floating-point rounding in displayed currency. Mitigation: format with
  `Intl.NumberFormat`; assertions use tolerance.
- Rollback: the feature is additive and isolated; removing the two new files and reverting the
  `App.tsx`/`styles.css` nav additions fully removes it.

## Durable architecture impact

None. This is an additive client feature and does not change repository boundaries, so root
`DESIGN.md` is not updated.
