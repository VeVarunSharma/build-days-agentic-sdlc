import type { TableClient } from "@azure/data-tables";
import {
  AzureTableFeedbackStorage,
  FeedbackNotFoundError,
  InMemoryFeedbackStorage,
  seedStorage,
} from "../src/server/storage.js";
import type { Feedback } from "../src/shared/contracts.js";

const input = {
  title: "Useful workshop",
  description: "Keep the live walkthrough.",
  category: "facilitation" as const,
  displayName: "Grace",
};

describe("in-memory feedback storage", () => {
  it("creates and lists newest feedback first", async () => {
    const storage = new InMemoryFeedbackStorage();
    await storage.create(input, {
      id: "older",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await storage.create(
      { ...input, title: "Newer" },
      { id: "newer", createdAt: "2025-01-02T00:00:00.000Z" },
    );
    await storage.create(input, {
      id: "older-a",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await storage.create(input, {
      id: "older-z",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    expect((await storage.list()).map(({ id }) => id)).toEqual([
      "newer",
      "older",
      "older-a",
      "older-z",
    ]);
  });

  it("orders by votes, creation time, and ID when requested", async () => {
    const storage = new InMemoryFeedbackStorage();
    await storage.create(input, {
      id: "tie-z",
      createdAt: "2025-01-02T00:00:00.000Z",
    });
    await storage.create(input, {
      id: "more-votes",
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    await storage.create(input, {
      id: "tie-newer",
      createdAt: "2025-01-03T00:00:00.000Z",
    });
    await storage.create(input, {
      id: "tie-a",
      createdAt: "2025-01-02T00:00:00.000Z",
    });
    await storage.vote("more-votes", "client-1");
    await storage.vote("more-votes", "client-2");
    await storage.vote("tie-z", "client-1");
    await storage.vote("tie-newer", "client-1");
    await storage.vote("tie-a", "client-1");

    expect(
      (await storage.list("most-votes-first")).map(({ id }) => id),
    ).toEqual(["more-votes", "tie-newer", "tie-a", "tie-z"]);
  });

  it("counts one vote per client and feedback item", async () => {
    const storage = new InMemoryFeedbackStorage();
    const feedback = await storage.create(input);

    const first = await storage.vote(feedback.id, "client-1");
    const duplicate = await storage.vote(feedback.id, "client-1");
    const secondClient = await storage.vote(feedback.id, "client-2");

    expect(first).toMatchObject({ alreadyVoted: false, feedback: { votes: 1 } });
    expect(duplicate).toMatchObject({
      alreadyVoted: true,
      feedback: { votes: 1 },
    });
    expect(secondClient.feedback.votes).toBe(2);
  });

  it("reports missing feedback", async () => {
    const storage = new InMemoryFeedbackStorage();
    await expect(storage.vote("missing", "client-1")).rejects.toBeInstanceOf(
      FeedbackNotFoundError,
    );
  });

  it("seeds deterministic data idempotently", async () => {
    const storage = new InMemoryFeedbackStorage();
    await seedStorage(storage);
    await seedStorage(storage);
    expect(await storage.list()).toHaveLength(2);
  });
});

describe("Azure Table feedback storage", () => {
  it("applies the default and requested ordering to listed entities", async () => {
    const entities = [
      makeFeedbackEntity("tie-z", "2025-01-02T00:00:00.000Z", 3),
      makeFeedbackEntity("more-votes", "2025-01-01T00:00:00.000Z", 4),
      makeFeedbackEntity("tie-newer", "2025-01-03T00:00:00.000Z", 3),
      makeFeedbackEntity("tie-a", "2025-01-02T00:00:00.000Z", 3),
    ];
    const table = {
      listEntities: vi.fn(() => entityIterator(entities)),
    };
    const storage = new AzureTableFeedbackStorage(
      table as unknown as TableClient,
    );

    expect((await storage.list()).map(({ id }) => id)).toEqual([
      "tie-newer",
      "tie-a",
      "tie-z",
      "more-votes",
    ]);
    expect(
      (await storage.list("most-votes-first")).map(({ id }) => id),
    ).toEqual(["more-votes", "tie-newer", "tie-a", "tie-z"]);
  });

  it("records the vote marker and counter in one transaction", async () => {
    const table = {
      getEntity: vi.fn().mockResolvedValue({
        partitionKey: "feedback-1",
        rowKey: "feedback",
        title: input.title,
        description: input.description,
        category: input.category,
        displayName: input.displayName,
        votes: 2,
        createdAt: "2025-01-01T00:00:00.000Z",
        etag: "etag-1",
      }),
      submitTransaction: vi.fn().mockResolvedValue({}),
    };
    const storage = new AzureTableFeedbackStorage(
      table as unknown as TableClient,
    );

    const result = await storage.vote("feedback-1", "client-1");

    expect(result).toMatchObject({
      alreadyVoted: false,
      feedback: { votes: 3 },
    });
    expect(table.submitTransaction).toHaveBeenCalledOnce();
    const actions = table.submitTransaction.mock.calls[0]?.[0];
    expect(actions).toHaveLength(2);
    expect(actions[0][0]).toBe("create");
    expect(actions[1]).toMatchObject(["update", { votes: 3 }, "Replace"]);
  });

  it("reports an existing Azure vote without increasing the count", async () => {
    const table = {
      getEntity: vi.fn().mockResolvedValue({
        partitionKey: "feedback-1",
        rowKey: "feedback",
        title: input.title,
        description: input.description,
        category: input.category,
        displayName: input.displayName,
        votes: 2,
        createdAt: "2025-01-01T00:00:00.000Z",
        etag: "etag-1",
      }),
      submitTransaction: vi.fn().mockRejectedValue({ statusCode: 409 }),
    };
    const storage = new AzureTableFeedbackStorage(
      table as unknown as TableClient,
    );

    await expect(storage.vote("feedback-1", "client-1")).resolves.toMatchObject({
      alreadyVoted: true,
      feedback: { votes: 2 },
    });
  });

  function makeFeedbackEntity(
    id: string,
    createdAt: string,
    votes: number,
  ): Feedback & { partitionKey: string; rowKey: string } {
    return {
      partitionKey: id,
      rowKey: "feedback",
      id,
      title: id,
      description: id,
      category: "idea",
      displayName: "Participant",
      votes,
      createdAt,
    };
  }

  function entityIterator<T>(entities: T[]): AsyncIterable<T> {
    return {
      async *[Symbol.asyncIterator]() {
        yield* entities;
      },
    };
  }
});
