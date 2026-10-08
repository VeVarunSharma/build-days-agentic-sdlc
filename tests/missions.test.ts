import { ZodError } from "zod";
import {
  InMemoryProductCatalogue,
  products,
} from "../src/server/catalogue.js";
import {
  validateMissionProposal,
} from "../src/server/missions.js";

const mission = {
  goal: "Create a practical home office setup",
  budgetCents: 10_000,
  maxItems: 3,
};

const proposal = {
  title: "Focused home office",
  summary: "Lighting and notebooks for focused work.",
  items: [
    {
      productId: "aurora-desk-lamp",
      quantity: 1,
      reason: "Adds adjustable task lighting.",
    },
    {
      productId: "papertrail-notebook-set",
      quantity: 2,
      reason: "Provides dedicated planning notebooks.",
    },
  ],
  limitations: ["Does not include a desk or chair."],
};

describe("mission proposal validation", () => {
  it("resolves products and calculates canonical line and plan totals", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(
      validateMissionProposal(mission, proposal, catalogue),
    ).resolves.toEqual({
      mission,
      title: proposal.title,
      summary: proposal.summary,
      items: [
        {
          product: products[0],
          quantity: 1,
          reason: proposal.items[0]?.reason,
          lineTotalCents: 4299,
        },
        {
          product: products[6],
          quantity: 2,
          reason: proposal.items[1]?.reason,
          lineTotalCents: 4598,
        },
      ],
      limitations: proposal.limitations,
      totalCents: 8897,
    });
  });

  it("rejects malformed untrusted proposals before catalogue access", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(
      validateMissionProposal(
        mission,
        {
          ...proposal,
          items: [{ productId: "aurora-desk-lamp", quantity: 0 }],
        },
        catalogue,
      ),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it.each([
    {
      name: "unknown products",
      changedProposal: {
        ...proposal,
        items: [{ ...proposal.items[0], productId: "invented-product" }],
      },
      code: "UNKNOWN_PRODUCT",
    },
    {
      name: "duplicate products",
      changedProposal: {
        ...proposal,
        items: [proposal.items[0], proposal.items[0]],
      },
      code: "DUPLICATE_PRODUCT",
    },
    {
      name: "plans exceeding the maximum item count",
      changedProposal: proposal,
      changedMission: { ...mission, maxItems: 2 },
      code: "ITEM_LIMIT_EXCEEDED",
    },
    {
      name: "plans exceeding the budget",
      changedProposal: proposal,
      changedMission: { ...mission, budgetCents: 8000 },
      code: "BUDGET_EXCEEDED",
    },
  ])("rejects $name", async ({ changedProposal, changedMission, code }) => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(
      validateMissionProposal(
        changedMission ?? mission,
        changedProposal,
        catalogue,
      ),
    ).rejects.toMatchObject({
      name: "MissionProposalValidationError",
      code,
    });
  });
});
