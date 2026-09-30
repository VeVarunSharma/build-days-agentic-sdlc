import request from "supertest";
import { createApp } from "../src/server/app.js";
import { InMemoryFeedbackStorage } from "../src/server/storage.js";

describe("author summary smoke", () => {
  it("reflects created feedback and votes end to end", async () => {
    const app = createApp({
      storage: new InMemoryFeedbackStorage(),
      logger: { log: () => undefined },
    });
    const summary = (name: string) =>
      request(app).get("/api/author-summary").query({ displayName: name });

    await summary("Sam").expect(200, {
      displayName: "Sam",
      itemCount: 0,
      totalVotes: 0,
    });

    const created = await request(app)
      .post("/api/feedback")
      .send({
        title: "Better examples",
        description: "Show another API example.",
        category: "content",
        displayName: "Sam",
      })
      .expect(201);
    await request(app)
      .post(`/api/feedback/${created.body.feedback.id}/votes`)
      .send({ clientId: "smoke-client" })
      .expect(201);

    const after = await summary("Sam").expect(200);
    expect(after.body).toEqual({
      displayName: "Sam",
      itemCount: 1,
      totalVotes: 1,
    });
    expect((await summary("sam").expect(200)).body.itemCount).toBe(0);
    await summary("   ").expect(400);
  });
});