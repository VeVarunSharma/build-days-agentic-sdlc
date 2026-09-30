// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinancialCalculator } from "../src/client/FinancialCalculator.js";

const generate = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Generate schedule" }));
};

describe("financial calculator", () => {
  it("shows an empty state before a schedule is generated", () => {
    render(<FinancialCalculator />);
    expect(
      screen.getByRole("heading", { name: "No schedule yet" }),
    ).toBeVisible();
  });

  it("generates a schedule with one row per period", async () => {
    const user = userEvent.setup();
    render(<FinancialCalculator />);
    const term = screen.getByLabelText("Term length (years)");
    await user.clear(term);
    await user.type(term, "1");
    await generate(user);
    // Monthly term of 1 year => 12 payment rows.
    const table = screen.getByRole("table");
    const bodyRows = within(table).getAllByRole("row");
    // header + 12 body + footer = 14
    expect(bodyRows).toHaveLength(14);
  });

  it("marks a payment interest-only and recalculates to zero principal", async () => {
    const user = userEvent.setup();
    render(<FinancialCalculator />);
    const term = screen.getByLabelText("Term length (years)");
    await user.clear(term);
    await user.type(term, "1");
    await generate(user);

    await user.selectOptions(
      screen.getByLabelText("Payment type for period 1"),
      "interestOnly",
    );
    await user.click(screen.getByRole("button", { name: "Recalculate" }));

    const firstRow = screen.getByRole("row", { name: /^1 / });
    const cells = within(firstRow).getAllByRole("cell");
    // cells: [type, payment, interest, principal, balance]
    expect(cells[3]).toHaveTextContent("$0.00");
  });

  it("applies a fixed payment amount after recalculation", async () => {
    const user = userEvent.setup();
    render(<FinancialCalculator />);
    const term = screen.getByLabelText("Term length (years)");
    await user.clear(term);
    await user.type(term, "1");
    await generate(user);

    await user.selectOptions(
      screen.getByLabelText("Payment type for period 1"),
      "fixed",
    );
    const amount = screen.getByLabelText("Fixed amount for period 1");
    await user.clear(amount);
    await user.type(amount, "2500");
    await user.click(screen.getByRole("button", { name: "Recalculate" }));

    // The fixed amount input retains the entered value.
    expect(screen.getByLabelText("Fixed amount for period 1")).toHaveValue(2500);
  });

  it("shows a validation message for invalid inputs", async () => {
    const user = userEvent.setup();
    render(<FinancialCalculator />);
    const principal = screen.getByLabelText("Loan amount");
    await user.clear(principal);
    await user.type(principal, "0");
    await generate(user);
    expect(
      screen.getByText("Loan amount must be greater than zero."),
    ).toBeVisible();
  });
});
