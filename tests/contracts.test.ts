import {
  compareFeedback,
  createFeedbackSchema,
  feedbackSortModeSchema,
  feedbackSortModes,
  fieldLimits,
  voteRequestSchema,
  type Feedback,
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

  it("defines the supported feedback sort modes", () => {
    expect(feedbackSortModes).toEqual(["newest-first", "most-votes-first"]);
    expect(feedbackSortModeSchema.parse("newest-first")).toBe("newest-first");
    expect(feedbackSortModeSchema.parse("most-votes-first")).toBe(
      "most-votes-first",
    );
    expect(feedbackSortModeSchema.safeParse("oldest-first").success).toBe(
      false,
    );
  });

  it("orders newest feedback first and breaks timestamp ties by ID", () => {
    const items = [
      makeFeedback("older-z", "2025-01-01T00:00:00.000Z", 8),
      makeFeedback("newest", "2025-01-02T00:00:00.000Z", 0),
      makeFeedback("older-a", "2025-01-01T00:00:00.000Z", 1),
    ];

    expect(items.sort((a, b) => compareFeedback(a, b)).map(({ id }) => id)).toEqual([
      "newest",
      "older-a",
      "older-z",
    ]);
  });

  it("orders by votes, then creation time, then ID", () => {
    const items = [
      makeFeedback("tie-z", "2025-01-02T00:00:00.000Z", 3),
      makeFeedback("more-votes", "2025-01-01T00:00:00.000Z", 4),
      makeFeedback("tie-newer", "2025-01-03T00:00:00.000Z", 3),
      makeFeedback("tie-a", "2025-01-02T00:00:00.000Z", 3),
    ];

    expect(
      items
        .sort((a, b) => compareFeedback(a, b, "most-votes-first"))
        .map(({ id }) => id),
    ).toEqual(["more-votes", "tie-newer", "tie-a", "tie-z"]);
  });
});

function makeFeedback(id: string, createdAt: string, votes: number): Feedback {
  return {
    id,
    title: id,
    description: id,
    category: "idea",
    displayName: "Participant",
    votes,
    createdAt,
  };
}
