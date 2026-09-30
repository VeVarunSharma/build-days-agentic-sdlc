## ADDED Requirements

### Requirement: Loan schedule generation

The calculator SHALL generate an amortization payment schedule from a loan amount, annual
interest rate, term length in years, payment frequency, balloon payment, deferral rate, and
number of deferral periods. The number of payments SHALL equal the term length in years
multiplied by the number of payments per year for the selected frequency.

#### Scenario: User generates a standard schedule

- **WHEN** the user submits a positive loan amount, positive rate, positive term, and a
  supported frequency with no balloon and no deferral
- **THEN** the calculator produces one row per payment period, each row showing the period
  number, payment amount, interest portion, principal portion, and remaining balance, and the
  payment amount is the level amortizing payment for those inputs

#### Scenario: Zero interest rate

- **WHEN** the user submits a zero annual interest rate
- **THEN** each payment equals the loan amount divided by the number of payments and the interest
  portion of every row is zero

#### Scenario: Balloon payment on the final period

- **WHEN** the user submits a positive balloon payment
- **THEN** the final payment row includes the balloon amount in addition to that period's
  scheduled payment

#### Scenario: Deferral reduces early payments

- **WHEN** the user submits a deferral rate greater than zero and a positive number of deferral
  periods
- **THEN** the payment amount for each period within the deferral window is reduced by the
  deferral rate percentage and later periods use the full scheduled payment

#### Scenario: Invalid inputs are rejected

- **WHEN** the user submits a non-positive loan amount, a non-positive term, a negative rate, or
  a negative balloon or deferral value
- **THEN** the calculator does not produce a schedule and shows an actionable validation message

### Requirement: Editable per-payment types

The calculator SHALL let the user change any generated payment row to one of Normal, Fixed, or
Interest-only. For a Fixed row the user SHALL provide the payment amount; for an Interest-only
row the payment SHALL equal that period's interest and the principal portion SHALL be zero.

#### Scenario: User marks a payment interest-only

- **WHEN** the user changes a row's type to Interest-only
- **THEN** that row is flagged interest-only and, after recalculation, its payment equals its
  interest and its principal portion is zero

#### Scenario: User marks a payment fixed

- **WHEN** the user changes a row's type to Fixed and enters a payment amount
- **THEN** that row uses the entered amount as its payment after recalculation

### Requirement: Recalculation

The calculator SHALL provide a Recalculate action that recomputes interest, principal, and
remaining balance for every row in order, applying each row's selected type and amount. The
ending balance SHALL float and is not forced to zero.

#### Scenario: Recalculate after edits

- **WHEN** the user has changed one or more rows and activates Recalculate
- **THEN** every row's interest is computed from the balance carried in from the prior row, the
  principal and running balance are updated from each row's payment and type, and the displayed
  ending balance reflects the edits without being forced to zero

### Requirement: Calculator navigation and accessibility

The application SHALL let the user navigate between the feedback board and the financial
calculator, and the calculator inputs and results grid SHALL use accessible labels and table
semantics.

#### Scenario: User opens the calculator

- **WHEN** the user selects the calculator navigation control
- **THEN** the calculator page is shown with labeled inputs and, once generated, the schedule is
  presented as a table with column headers

#### Scenario: User returns to the feedback board

- **WHEN** the user selects the feedback board navigation control
- **THEN** the feedback board is shown and continues to function as before
