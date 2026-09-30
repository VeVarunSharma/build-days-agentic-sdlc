import {
  createFeedbackSchema,
  fieldLimits,
  voteRequestSchema,
  type AuthorSummary,
} from "../src/shared/contracts.js";

describe("feedback contracts", () => {
  it("normalizes valid feedback", () => {
    expect(
      createFeedbackSchema.parse({
        title: "  Clear examples  ",
        description: "  Add examples  ",
        category: "content",
        displayName: "  Ada  ",
      }),
    ).toEqual({
      title: "Clear examples",
      description: "Add examples",
      category: "content",
      displayName: "Ada",
    });
  });

  it("rejects missing and oversized fields", () => {
    const result = createFeedbackSchema.safeParse({
      title: "x".repeat(fieldLimits.title + 1),
      description: "",
      category: "unknown",
      displayName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining([
          "title",
          "description",
          "category",
          "displayName",
        ]),
      );
    }
  });

  it("accepts workshop-safe client identifiers only", () => {
    expect(voteRequestSchema.safeParse({ clientId: "client_123-abc" }).success).toBe(
      true,
    );
    expect(voteRequestSchema.safeParse({ clientId: "not/valid" }).success).toBe(
      false,
    );
  });
});

describe("author summary contract", () => {
  it("exposes only displayName, itemCount, and totalVotes", () => {
    const summary: AuthorSummary = {
      displayName: "Grace",
      itemCount: 2,
      totalVotes: 3,
    };
    expect(Object.keys(summary).sort()).toEqual([
      "displayName",
      "itemCount",
      "totalVotes",
    ]);
    expect(Number.isInteger(summary.itemCount)).toBe(true);
    expect(Number.isInteger(summary.totalVotes)).toBe(true);
  });
});
