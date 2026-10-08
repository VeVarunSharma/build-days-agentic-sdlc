import request from "supertest";
import { createApp } from "../src/server/app.js";
import {
  InMemoryProductCatalogue,
  type ProductCatalogue,
} from "../src/server/catalogue.js";
import {
  FoundryShoppingMissionPlanner,
  ShoppingMissionPlannerUnavailableError,
  type ShoppingMissionPlanner,
} from "../src/server/foundry-missions.js";
import type { Logger } from "../src/server/logger.js";

const silentLogger: Logger = { log: () => undefined };
const validMission = {
  goal: "Create a productive desk setup",
  budgetCents: 10_000,
  maxItems: 3,
};
const validProposal = {
  title: "Focused desk essentials",
  summary: "A compact set for focused work.",
  items: [
    {
      productId: "aurora-desk-lamp",
      quantity: 1,
      reason: "Adds adjustable task lighting.",
    },
    {
      productId: "papertrail-notebook-set",
      quantity: 1,
      reason: "Supports planning and notes.",
    },
  ],
  limitations: [],
};

const plannerReturning = (proposal: unknown): ShoppingMissionPlanner => ({
  plan: () => Promise.resolve(proposal),
});

describe("product API", () => {
  it("exposes liveness and catalogue-backed readiness", async () => {
    const catalogue = new InMemoryProductCatalogue();
    const app = createApp({ catalogue, logger: silentLogger });

    await request(app).get("/health").expect(200, { status: "healthy" });
    await request(app).get("/ready").expect(200, { status: "ready" });
  });

  it("returns 503 when the catalogue is unavailable", async () => {
    const catalogue = new InMemoryProductCatalogue();
    catalogue.checkHealth = () => Promise.reject(new Error("secret details"));
    const app = createApp({ catalogue, logger: silentLogger });

    const response = await request(app).get("/ready").expect(503);
    expect(response.text).not.toContain("secret details");
    expect(response.body.error.code).toBe("CATALOGUE_UNAVAILABLE");
  });

  it("lists, searches, and filters deterministic products", async () => {
    const app = createApp({
      catalogue: new InMemoryProductCatalogue(),
      logger: silentLogger,
    });

    const list = await request(app).get("/api/products").expect(200);
    expect(list.body.total).toBe(8);
    expect(list.body.categories).toEqual(["home", "outdoors", "office", "kitchen"]);

    const filtered = await request(app)
      .get("/api/products?q=lamp&category=office")
      .expect(200);
    expect(filtered.body).toMatchObject({
      total: 1,
      query: { q: "lamp", category: "office" },
      items: [{ id: "aurora-desk-lamp" }],
    });
  });

  describe("shopping mission API", () => {
    it("returns a canonically validated mission plan", async () => {
      const plan = vi.fn(() => Promise.resolve(validProposal));
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner: { plan },
        logger: silentLogger,
      });

      const response = await request(app)
        .post("/api/shopping-missions")
        .send(validMission)
        .expect(200);

      expect(response.body.plan).toMatchObject({
        mission: validMission,
        title: validProposal.title,
        totalCents: 6598,
        items: [
          { product: { id: "aurora-desk-lamp" }, quantity: 1 },
          { product: { id: "papertrail-notebook-set" }, quantity: 1 },
        ],
      });
      expect(plan).toHaveBeenCalledWith(
        validMission,
        expect.any(Array),
        expect.any(AbortSignal),
      );
    });

    it("returns an explicit error when Foundry is unconfigured", async () => {
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner: new FoundryShoppingMissionPlanner({
          endpoint: "",
          agentName: "",
        }),
        logger: silentLogger,
      });

      await request(app)
        .post("/api/shopping-missions")
        .send(validMission)
        .expect(503, {
          error: {
            code: "MISSION_PLANNER_UNCONFIGURED",
            message: "Shopping mission planning is not configured.",
          },
        });
    });

    it("returns a safe error when Foundry is unavailable", async () => {
      const missionPlanner: ShoppingMissionPlanner = {
        plan: () => Promise.reject(new ShoppingMissionPlannerUnavailableError()),
      };
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner,
        logger: silentLogger,
      });

      const response = await request(app)
        .post("/api/shopping-missions")
        .send(validMission)
        .expect(502);

      expect(response.body.error.code).toBe("MISSION_PLANNER_UNAVAILABLE");
      expect(response.text).not.toContain("FOUNDRY");
    });

    it("rejects invalid requests before invoking the planner", async () => {
      const plan = vi.fn();
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner: { plan },
        logger: silentLogger,
      });

      const response = await request(app)
        .post("/api/shopping-missions")
        .send({ goal: "", budgetCents: 0, maxItems: 0, extra: true })
        .expect(400);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.fieldErrors).toMatchObject({
        goal: expect.any(Array),
        budgetCents: expect.any(Array),
        maxItems: expect.any(Array),
      });
      expect(plan).not.toHaveBeenCalled();
    });

    it("rejects proposals that fail canonical validation", async () => {
      const proposal = {
        ...validProposal,
        items: [
          {
            productId: "missing-product",
            quantity: 1,
            reason: "This product does not exist.",
          },
        ],
      };
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner: plannerReturning(proposal),
        logger: silentLogger,
      });

      await request(app)
        .post("/api/shopping-missions")
        .send(validMission)
        .expect(502, {
          error: {
            code: "MISSION_PROPOSAL_INVALID",
            message: "The shopping mission response could not be validated.",
          },
        });
    });

    it("rate-limits missions without affecting health or readiness", async () => {
      const app = createApp({
        catalogue: new InMemoryProductCatalogue(),
        missionPlanner: plannerReturning(validProposal),
        logger: silentLogger,
      });

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await request(app)
          .post("/api/shopping-missions")
          .send(validMission)
          .expect(200);
      }

      await request(app).post("/api/shopping-missions").send(validMission).expect(429, {
        error: {
          code: "MISSION_RATE_LIMITED",
          message: "Too many shopping mission requests. Try again shortly.",
        },
      });
      await request(app).get("/health").expect(200, { status: "healthy" });
      await request(app).get("/ready").expect(200, { status: "ready" });
    });
  });

  it("returns product details and safe not-found responses", async () => {
    const app = createApp({
      catalogue: new InMemoryProductCatalogue(),
      logger: silentLogger,
    });

    const detail = await request(app)
      .get("/api/products/trailmark-bottle")
      .expect(200);
    expect(detail.body.product).toMatchObject({
      name: "Trailmark Bottle",
      priceCents: 3199,
    });
    await request(app).get("/api/products/missing").expect(404, {
      error: { code: "NOT_FOUND", message: "Product was not found." },
    });
  });

  it("returns actionable validation for invalid filters", async () => {
    const app = createApp({
      catalogue: new InMemoryProductCatalogue(),
      logger: silentLogger,
    });
    const response = await request(app)
      .get("/api/products?category=electronics")
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fieldErrors: {
        category: expect.any(Array),
      },
    });
  });

  it("rate-limits repeated application requests without blocking liveness", async () => {
    const app = createApp({
      catalogue: new InMemoryProductCatalogue(),
      logger: silentLogger,
    });

    for (let attempt = 0; attempt < 120; attempt += 1) {
      await request(app).get("/api/products").expect(200);
    }

    await request(app).get("/api/products").expect(429, {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again shortly.",
      },
    });
    await request(app).get("/health").expect(200, { status: "healthy" });
  });

  it("converts unexpected catalogue failures to safe errors", async () => {
    const catalogue: ProductCatalogue = {
      list: () => Promise.reject(new Error("connection string was secret")),
      getById: () => Promise.reject(new Error("unused")),
      checkHealth: () => Promise.resolve(),
    };
    const app = createApp({ catalogue, logger: silentLogger });
    const response = await request(app).get("/api/products").expect(500);
    expect(response.text).not.toContain("connection string");
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});
