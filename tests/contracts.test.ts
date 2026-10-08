import {
  cartQuantitySchema,
  fieldLimits,
  productQuerySchema,
  promptAgentProposalSchema,
  shoppingMissionRequestSchema,
} from "../src/shared/contracts.js";

describe("commerce contracts", () => {
  it("normalizes valid product queries", () => {
    expect(productQuerySchema.parse({ q: "  lamp  ", category: "office" })).toEqual({
      q: "lamp",
      category: "office",
    });
  });

  it("rejects unsupported categories and oversized search", () => {
    const result = productQuerySchema.safeParse({
      q: "x".repeat(fieldLimits.search + 1),
      category: "electronics",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["q", "category"]),
      );
    }
  });

  it("bounds cart quantities", () => {
    expect(cartQuantitySchema.parse({ quantity: 3 })).toEqual({ quantity: 3 });
    expect(cartQuantitySchema.safeParse({ quantity: 0 }).success).toBe(false);
    expect(
      cartQuantitySchema.safeParse({ quantity: fieldLimits.quantity + 1 }).success,
    ).toBe(false);
  });

  it("normalizes and bounds shopping mission requests", () => {
    expect(
      shoppingMissionRequestSchema.parse({
        goal: "  Equip a calm reading nook  ",
        budgetCents: 10_000,
        maxItems: 3,
      }),
    ).toEqual({
      goal: "Equip a calm reading nook",
      budgetCents: 10_000,
      maxItems: 3,
    });

    expect(
      shoppingMissionRequestSchema.safeParse({
        goal: "",
        budgetCents: 0,
        maxItems: fieldLimits.missionMaxItems + 1,
      }).success,
    ).toBe(false);
  });

  it("treats prompt-agent proposals as strict untrusted input", () => {
    const proposal = {
      title: "  Reading nook essentials  ",
      summary: "  A focused two-product set.  ",
      items: [
        {
          productId: "  aurora-desk-lamp  ",
          quantity: 1,
          reason: "  Provides focused light.  ",
        },
      ],
      limitations: ["  Does not include seating.  "],
    };

    expect(promptAgentProposalSchema.parse(proposal)).toEqual({
      title: "Reading nook essentials",
      summary: "A focused two-product set.",
      items: [
        {
          productId: "aurora-desk-lamp",
          quantity: 1,
          reason: "Provides focused light.",
        },
      ],
      limitations: ["Does not include seating."],
    });
    expect(
      promptAgentProposalSchema.safeParse({
        ...proposal,
        items: [{ ...proposal.items[0], quantity: 0 }],
      }).success,
    ).toBe(false);
    expect(
      promptAgentProposalSchema.safeParse({ ...proposal, ignored: true }).success,
    ).toBe(false);
  });
});
