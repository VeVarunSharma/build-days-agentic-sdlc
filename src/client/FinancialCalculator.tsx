import { useId, useState, type FormEvent } from "react";
import {
  frequencyLabels,
  generateSchedule,
  LoanInputError,
  paymentFrequencies,
  recalculate,
  type LoanInputs,
  type PaymentType,
  type ScheduleRow,
} from "./finance.js";

const defaultInputs: LoanInputs = {
  principal: 100000,
  annualRatePercent: 6,
  termYears: 5,
  frequency: "monthly",
  balloon: 0,
  deferralRatePercent: 0,
  deferralPeriods: 0,
};

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const paymentTypeLabels: Record<PaymentType, string> = {
  normal: "Normal",
  fixed: "Fixed",
  interestOnly: "Interest-only",
};

export function FinancialCalculator() {
  const [inputs, setInputs] = useState<LoanInputs>(defaultInputs);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [error, setError] = useState<string>();
  const statusId = useId();

  const endingBalance = rows.length ? rows[rows.length - 1]!.balance : 0;

  const setField = (field: keyof LoanInputs, value: number) =>
    setInputs((current) => ({ ...current, [field]: value }));

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    try {
      setRows(generateSchedule(inputs));
    } catch (generateError) {
      setRows([]);
      setError(messageFor(generateError));
    }
  }

  function updateRow(period: number, patch: Partial<ScheduleRow>) {
    setRows((current) =>
      current.map((row) =>
        row.period === period ? { ...row, ...patch } : row,
      ),
    );
  }

  function recompute() {
    setError(undefined);
    try {
      setRows((current) => recalculate(current, inputs));
    } catch (recomputeError) {
      setError(messageFor(recomputeError));
    }
  }

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">Agentic SDLC workshop</p>
          <h1>Financial calculator</h1>
          <p>
            Enter loan terms to generate an amortization schedule, then adjust
            individual payments and recalculate.
          </p>
        </div>
      </header>
      <main>
        <section className="panel form-panel" aria-labelledby="calc-form-title">
          <h2 id="calc-form-title">Loan inputs</h2>
          <form onSubmit={generate} noValidate>
            <div className="calc-grid">
              <NumberField
                label="Loan amount"
                name="principal"
                value={inputs.principal}
                min={0}
                step={1000}
                onChange={(value) => setField("principal", value)}
              />
              <NumberField
                label="Annual rate (%)"
                name="annualRatePercent"
                value={inputs.annualRatePercent}
                min={0}
                step={0.1}
                onChange={(value) => setField("annualRatePercent", value)}
              />
              <NumberField
                label="Term length (years)"
                name="termYears"
                value={inputs.termYears}
                min={0}
                step={1}
                onChange={(value) => setField("termYears", value)}
              />
              <label>
                Payment frequency
                <select
                  name="frequency"
                  value={inputs.frequency}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      frequency: event.target
                        .value as LoanInputs["frequency"],
                    }))
                  }
                >
                  {paymentFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequencyLabels[frequency]}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Balloon payment"
                name="balloon"
                value={inputs.balloon}
                min={0}
                step={1000}
                onChange={(value) => setField("balloon", value)}
              />
              <NumberField
                label="Deferral rate (%)"
                name="deferralRatePercent"
                value={inputs.deferralRatePercent}
                min={0}
                step={1}
                onChange={(value) => setField("deferralRatePercent", value)}
              />
              <NumberField
                label="Deferral periods"
                name="deferralPeriods"
                value={inputs.deferralPeriods}
                min={0}
                step={1}
                onChange={(value) => setField("deferralPeriods", value)}
              />
            </div>
            <button type="submit">Generate schedule</button>
          </form>
          <div id={statusId} className="status" aria-live="polite">
            {error && <p className="error">{error}</p>}
          </div>
        </section>

        <section className="board" aria-labelledby="schedule-title">
          <div className="board-heading">
            <div>
              <p className="eyebrow">Payment schedule</p>
              <h2 id="schedule-title">Payments</h2>
            </div>
            {rows.length > 0 && (
              <button type="button" className="recalc" onClick={recompute}>
                Recalculate
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <div className="state">
              <h3>No schedule yet</h3>
              <p>Enter loan inputs and generate a schedule to see payments.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="schedule">
                <caption className="sr-only">Loan payment schedule</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Type</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Interest</th>
                    <th scope="col">Principal</th>
                    <th scope="col">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.period}>
                      <th scope="row">{row.period}</th>
                      <td>
                        <label className="sr-only" htmlFor={`type-${row.period}`}>
                          Payment type for period {row.period}
                        </label>
                        <select
                          id={`type-${row.period}`}
                          value={row.type}
                          onChange={(event) =>
                            updateRow(row.period, {
                              type: event.target.value as PaymentType,
                            })
                          }
                        >
                          {(Object.keys(paymentTypeLabels) as PaymentType[]).map(
                            (type) => (
                              <option key={type} value={type}>
                                {paymentTypeLabels[type]}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td>
                        {row.type === "fixed" ? (
                          <>
                            <label
                              className="sr-only"
                              htmlFor={`amount-${row.period}`}
                            >
                              Fixed amount for period {row.period}
                            </label>
                            <input
                              id={`amount-${row.period}`}
                              type="number"
                              min={0}
                              step={100}
                              value={row.fixedAmount}
                              onChange={(event) =>
                                updateRow(row.period, {
                                  fixedAmount: Number(event.target.value),
                                })
                              }
                            />
                          </>
                        ) : (
                          currency.format(row.payment)
                        )}
                      </td>
                      <td>{currency.format(row.interest)}</td>
                      <td>{currency.format(row.principal)}</td>
                      <td>{currency.format(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={5}>
                      Ending balance
                    </th>
                    <td>{currency.format(endingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

interface NumberFieldProps {
  label: string;
  name: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  name,
  value,
  min,
  step,
  onChange,
}: NumberFieldProps) {
  return (
    <label>
      {label}
      <input
        id={name}
        name={name}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

const messageFor = (error: unknown): string =>
  error instanceof LoanInputError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Something went wrong. Check your inputs and try again.";
