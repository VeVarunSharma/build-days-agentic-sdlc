export const paymentFrequencies = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export type PaymentFrequency = (typeof paymentFrequencies)[number];

export const paymentsPerYear: Record<PaymentFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

export const frequencyLabels: Record<PaymentFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semi-annual",
  annual: "Annual",
};

export type PaymentType = "normal" | "fixed" | "interestOnly";

export interface LoanInputs {
  /** Loan amount (principal). */
  principal: number;
  /** Annual nominal interest rate, as a percentage (e.g. 6 for 6%). */
  annualRatePercent: number;
  /** Term length in years. */
  termYears: number;
  /** Payment frequency. */
  frequency: PaymentFrequency;
  /** Lump sum added to the final payment. */
  balloon: number;
  /** Percentage reduction applied to payments during the deferral window. */
  deferralRatePercent: number;
  /** Number of initial periods the deferral reduction applies to. */
  deferralPeriods: number;
}

export interface ScheduleRow {
  period: number;
  type: PaymentType;
  /** Payment amount used when type is "fixed". */
  fixedAmount: number;
  /** Total payment for the period (including any balloon on the final row). */
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export class LoanInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoanInputError";
  }
}

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const periodRate = (inputs: LoanInputs): number =>
  inputs.annualRatePercent / 100 / paymentsPerYear[inputs.frequency];

/** Number of payment periods implied by the term and frequency. */
export const periodCount = (inputs: LoanInputs): number =>
  Math.round(inputs.termYears * paymentsPerYear[inputs.frequency]);

/** Level amortizing payment for the loan, ignoring balloon and deferral. */
export const basePayment = (inputs: LoanInputs): number => {
  const n = periodCount(inputs);
  const i = periodRate(inputs);
  if (i === 0) {
    return inputs.principal / n;
  }
  return (inputs.principal * i) / (1 - Math.pow(1 + i, -n));
};

const validate = (inputs: LoanInputs): void => {
  if (!(inputs.principal > 0)) {
    throw new LoanInputError("Loan amount must be greater than zero.");
  }
  if (!(inputs.termYears > 0)) {
    throw new LoanInputError("Term length must be greater than zero.");
  }
  if (inputs.annualRatePercent < 0) {
    throw new LoanInputError("Interest rate cannot be negative.");
  }
  if (inputs.balloon < 0) {
    throw new LoanInputError("Balloon payment cannot be negative.");
  }
  if (inputs.deferralRatePercent < 0 || inputs.deferralRatePercent > 100) {
    throw new LoanInputError("Deferral rate must be between 0 and 100.");
  }
  if (inputs.deferralPeriods < 0) {
    throw new LoanInputError("Deferral periods cannot be negative.");
  }
  if (periodCount(inputs) < 1) {
    throw new LoanInputError(
      "Term length and frequency must produce at least one payment.",
    );
  }
};

/** Scheduled (pre-edit) payment for a given period, applying the deferral window. */
const scheduledPayment = (inputs: LoanInputs, period: number): number => {
  const payment = basePayment(inputs);
  if (period <= inputs.deferralPeriods && inputs.deferralPeriods > 0) {
    return payment * (1 - inputs.deferralRatePercent / 100);
  }
  return payment;
};

/**
 * Compute a single row from a carried-in balance and the row's type/amount.
 * Interest is computed on the incoming balance; the ending balance floats.
 */
const computeRow = (
  inputs: LoanInputs,
  row: Pick<ScheduleRow, "period" | "type" | "fixedAmount">,
  openingBalance: number,
): ScheduleRow => {
  const n = periodCount(inputs);
  const i = periodRate(inputs);
  const interest = openingBalance * i;
  const isFinal = row.period === n;
  const balloon = isFinal ? inputs.balloon : 0;

  let payment: number;
  if (row.type === "interestOnly") {
    payment = interest + balloon;
  } else if (row.type === "fixed") {
    payment = row.fixedAmount + balloon;
  } else {
    payment = scheduledPayment(inputs, row.period) + balloon;
  }

  const principal = payment - interest;
  const balance = openingBalance - principal;

  return {
    period: row.period,
    type: row.type,
    fixedAmount: row.fixedAmount,
    payment: roundCurrency(payment),
    interest: roundCurrency(interest),
    principal: roundCurrency(principal),
    balance: roundCurrency(balance),
  };
};

/** Generate the initial amortization schedule. All rows default to "normal". */
export const generateSchedule = (inputs: LoanInputs): ScheduleRow[] => {
  validate(inputs);
  const n = periodCount(inputs);
  const rows: ScheduleRow[] = [];
  let balance = inputs.principal;
  for (let period = 1; period <= n; period += 1) {
    const row = computeRow(
      inputs,
      { period, type: "normal", fixedAmount: 0 },
      balance,
    );
    balance = row.balance;
    rows.push(row);
  }
  return rows;
};

/**
 * Recompute interest, principal, and balance for every row in order, honoring
 * each row's selected type and amount. The ending balance floats.
 */
export const recalculate = (
  rows: ScheduleRow[],
  inputs: LoanInputs,
): ScheduleRow[] => {
  validate(inputs);
  const result: ScheduleRow[] = [];
  let balance = inputs.principal;
  for (const row of rows) {
    const computed = computeRow(
      inputs,
      { period: row.period, type: row.type, fixedAmount: row.fixedAmount },
      balance,
    );
    balance = computed.balance;
    result.push(computed);
  }
  return result;
};
