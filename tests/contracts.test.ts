import {
  authorSummaryQuerySchema,
  createFeedbackSchema,
  fieldLimits,
  summarizeAuthor,
  voteRequestSchema,
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
  const items = [
    { displayName: "Sam", votes: 2 },
    { displayName: "Sam", votes: 3 },
    { displayName: "Lin", votes: 7 },
  ];

  it("returns totals for a known display name", () => {
    expect(summarizeAuthor(items, "Lin")).toEqual({
      displayName: "Lin",
      itemCount: 1,
      totalVotes: 7,
    });
  });

  it("aggregates multiple items by the same display name", () => {
    expect(summarizeAuthor(items, "Sam")).toEqual({
      displayName: "Sam",
      itemCount: 2,
      totalVotes: 5,
    });
  });

  it("returns zeros for an unknown or differently cased name", () => {
    expect(summarizeAuthor(items, "Nobody").itemCount).toBe(0);
    expect(summarizeAuthor(items, "sam")).toEqual({
      displayName: "sam",
      itemCount: 0,
      totalVotes: 0,
    });
  });

  it("trims and limits the display name query", () => {
    expect(authorSummaryQuerySchema.parse({ displayName: "  Sam " })).toEqual({
      displayName: "Sam",
    });
    expect(authorSummaryQuerySchema.safeParse({}).success).toBe(false);
    expect(authorSummaryQuerySchema.safeParse({ displayName: "   " }).success).toBe(false);
    expect(
      authorSummaryQuerySchema.safeParse({
        displayName: "x".repeat(fieldLimits.displayName + 1),
      }).success,
    ).toBe(false);
  });
});
