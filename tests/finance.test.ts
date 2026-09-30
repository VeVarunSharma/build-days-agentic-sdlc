import {
  basePayment,
  generateSchedule,
  LoanInputError,
  periodCount,
  recalculate,
  type LoanInputs,
} from "../src/client/finance.js";

const baseInputs: LoanInputs = {
  principal: 12000,
  annualRatePercent: 12,
  termYears: 1,
  frequency: "monthly",
  balloon: 0,
  deferralRatePercent: 0,
  deferralPeriods: 0,
};

describe("finance schedule generation", () => {
  it("produces one row per period with a level amortizing payment", () => {
    const rows = generateSchedule(baseInputs);
    expect(rows).toHaveLength(periodCount(baseInputs));
    expect(rows).toHaveLength(12);
    const payment = basePayment(baseInputs);
    for (const row of rows) {
      expect(row.payment).toBeCloseTo(Math.round(payment * 100) / 100, 2);
    }
    // First row: interest = 12000 * 0.01 = 120
    expect(rows[0]?.interest).toBeCloseTo(120, 2);
    // Fully amortizes to ~0 by the final period.
    expect(rows[11]?.balance).toBeCloseTo(0, 1);
  });

  it("handles a zero interest rate", () => {
    const rows = generateSchedule({ ...baseInputs, annualRatePercent: 0 });
    expect(rows[0]?.payment).toBeCloseTo(1000, 2);
    for (const row of rows) {
      expect(row.interest).toBe(0);
    }
    expect(rows[11]?.balance).toBeCloseTo(0, 2);
  });

  it("adds the balloon to the final payment", () => {
    const withBalloon = generateSchedule({ ...baseInputs, balloon: 5000 });
    const without = generateSchedule(baseInputs);
    const last = withBalloon[11];
    expect(last?.payment).toBeCloseTo((without[11]?.payment ?? 0) + 5000, 2);
    expect(last?.balance).toBeCloseTo((without[11]?.balance ?? 0) - 5000, 1);
  });

  it("reduces payments during the deferral window", () => {
    const rows = generateSchedule({
      ...baseInputs,
      deferralRatePercent: 50,
      deferralPeriods: 3,
    });
    const full = basePayment(baseInputs);
    expect(rows[0]?.payment).toBeCloseTo((full * 0.5 * 100) / 100, 1);
    expect(rows[2]?.payment).toBeCloseTo((full * 0.5 * 100) / 100, 1);
    // After the window, full payment resumes.
    expect(rows[3]?.payment).toBeCloseTo(Math.round(full * 100) / 100, 1);
  });

  it("rejects invalid inputs", () => {
    expect(() => generateSchedule({ ...baseInputs, principal: 0 })).toThrow(
      LoanInputError,
    );
    expect(() => generateSchedule({ ...baseInputs, termYears: 0 })).toThrow(
      LoanInputError,
    );
    expect(() =>
      generateSchedule({ ...baseInputs, annualRatePercent: -1 }),
    ).toThrow(LoanInputError);
    expect(() => generateSchedule({ ...baseInputs, balloon: -1 })).toThrow(
      LoanInputError,
    );
  });
});

describe("finance recalculation", () => {
  it("makes an interest-only row pay only interest with zero principal", () => {
    const rows = generateSchedule(baseInputs);
    rows[0] = { ...rows[0]!, type: "interestOnly" };
    const result = recalculate(rows, baseInputs);
    expect(result[0]?.interest).toBeCloseTo(120, 2);
    expect(result[0]?.payment).toBeCloseTo(120, 2);
    expect(result[0]?.principal).toBeCloseTo(0, 2);
    // Balance unchanged after an interest-only first period.
    expect(result[0]?.balance).toBeCloseTo(12000, 2);
  });

  it("uses the entered amount for a fixed row", () => {
    const rows = generateSchedule(baseInputs);
    rows[1] = { ...rows[1]!, type: "fixed", fixedAmount: 2000 };
    const result = recalculate(rows, baseInputs);
    expect(result[1]?.payment).toBeCloseTo(2000, 2);
    expect(result[1]?.principal).toBeCloseTo(2000 - (result[1]?.interest ?? 0), 2);
  });

  it("lets the ending balance float after edits", () => {
    const rows = generateSchedule(baseInputs).map((row) =>
      row.period <= 2 ? { ...row, type: "interestOnly" as const } : row,
    );
    const result = recalculate(rows, baseInputs);
    // Two skipped principal periods leave a positive ending balance.
    expect(result[11]?.balance ?? 0).toBeGreaterThan(0);
  });
});
