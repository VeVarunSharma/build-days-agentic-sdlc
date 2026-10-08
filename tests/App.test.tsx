// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/client/App.js";
import type {
  Product,
  ProductListResponse,
  ValidatedMissionPlan,
} from "../src/shared/contracts.js";

const product: Product = {
  id: "trail-lamp",
  name: "Glowpath Lantern",
  shortDescription: "A friendly light for late-night wandering.",
  description: "A rechargeable lantern designed for tabletops and trails.",
  category: "outdoors",
  priceCents: 2499,
  rating: 4.7,
  reviewCount: 83,
  availability: "in-stock",
  badge: "Trail favorite",
  features: ["Three brightness levels", "USB-C charging"],
  accent: "#527a62",
};

const listResponse = (items: Product[]): ProductListResponse => ({
  items,
  total: items.length,
  query: { q: "" },
  categories: ["home", "outdoors", "office", "kitchen"],
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const missionPlan = (
  quantity = 2,
  limitations = ["Prices and availability may change."],
): ValidatedMissionPlan => ({
  mission: {
    goal: "Light a campsite",
    budgetCents: 5000,
    maxItems: 3,
  },
  title: "A brighter campsite",
  summary: "A compact lighting bundle for evenings outside.",
  items: [
    {
      product,
      quantity,
      reason: "Provides portable light without taking much space.",
      lineTotalCents: product.priceCents * quantity,
    },
  ],
  limitations,
  totalCents: product.priceCents * quantity,
});

describe("Babazon client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads products and supports filters and an empty result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      return jsonResponse(
        url.includes("q=missing") ? listResponse([]) : listResponse([product]),
      );
    });
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    expect(await screen.findByRole("heading", { name: product.name })).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Category"), "outdoors");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/products?category=outdoors",
        expect.anything(),
      ),
    );

    await user.type(screen.getByLabelText("Search products"), "missing");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("heading", { name: "No products found" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByRole("heading", { name: product.name })).toBeVisible();
  });

  it("offers retry when the catalogue fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Catalogue connection failed."))
      .mockResolvedValueOnce(jsonResponse(listResponse([])));
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Catalogue connection failed.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "No products found" })).toBeVisible();
  });

  it("loads details and manages cart quantities and totals", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      return url === `/api/products/${product.id}`
        ? jsonResponse({ product })
        : jsonResponse(listResponse([product]));
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });

    await user.click(screen.getByRole("button", { name: "View details" }));
    expect(await screen.findByText(product.description)).toBeVisible();
    expect(screen.getByText("Three brightness levels")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Add to cart" })[0]!);
    const cart = screen.getByRole("heading", { name: "Cart" }).closest("aside")!;
    expect(within(cart).getByText("$24.99 each")).toBeVisible();
    expect(within(cart).getByText("$24.99", { selector: ".subtotal strong" })).toBeVisible();

    await user.clear(screen.getByLabelText(`Quantity for ${product.name}`));
    await user.type(screen.getByLabelText(`Quantity for ${product.name}`), "2");
    expect(within(cart).getByText("$49.98", { selector: ".subtotal strong" })).toBeVisible();

    await user.click(within(cart).getByRole("button", { name: "Remove" }));
    expect(within(cart).getByText("Your cart is empty.")).toBeVisible();
  });

  it("validates checkout, confirms the order, and resets the cart", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(listResponse([product])));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    await user.click(screen.getByRole("button", { name: "Place simulated order" }));

    expect(await screen.findByText("Enter your name.")).toBeVisible();
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText("Full name"), "Mira Chen");
    await user.type(screen.getByLabelText("Email"), "mira@example.com");
    await user.type(screen.getByLabelText("Delivery address"), "12 Comet Lane");
    await user.click(screen.getByRole("button", { name: "Place simulated order" }));

    expect(await screen.findByRole("heading", { name: "Order confirmed" })).toBeVisible();
    expect(screen.getByText("Your cart is empty.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cart 0" })).toBeVisible();
  });

  it("validates mission fields before making a request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(listResponse([product])));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });

    await user.type(screen.getByLabelText("Budget (dollars)"), "12.345");
    await user.clear(screen.getByLabelText("Maximum items"));
    await user.type(screen.getByLabelText("Maximum items"), "0");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));

    expect(screen.getByText("Goal is required.")).toBeVisible();
    expect(
      screen.getByText("Enter a dollar amount with no more than two decimal places."),
    ).toBeVisible();
    expect(
      screen.getByText("Maximum items must be at least 1."),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes("/api/shopping-missions"),
      ),
    ).toHaveLength(0);
  });

  it("builds a canonical mission plan and only adds it after confirmation", async () => {
    const plan = missionPlan();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input, init) => {
        if (String(input) === "/api/shopping-missions") {
          expect(init).toEqual(
            expect.objectContaining({
              method: "POST",
              body: JSON.stringify({
                goal: "Light a campsite",
                budgetCents: 5000,
                maxItems: 3,
              }),
            }),
          );
          return jsonResponse({ plan });
        }
        return jsonResponse(listResponse([product]));
      },
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });

    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "50");
    await user.clear(screen.getByLabelText("Maximum items"));
    await user.type(screen.getByLabelText("Maximum items"), "3");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));

    const proposedPlan = await screen.findByRole("heading", {
      name: plan.title,
    });
    const planSection = proposedPlan.closest("section")!;
    expect(within(planSection).getByText(plan.summary)).toBeVisible();
    expect(within(planSection).getByText(plan.items[0]!.reason)).toBeVisible();
    expect(within(planSection).getByText("2 × $24.99")).toBeVisible();
    expect(within(planSection).getAllByText("$49.98")).toHaveLength(2);
    expect(within(planSection).getByText(plan.limitations[0]!)).toBeVisible();
    expect(screen.getByRole("link", { name: "Cart 0" })).toBeVisible();

    await user.click(
      within(planSection).getByRole("button", { name: "Add bundle to cart" }),
    );
    expect(screen.getByRole("link", { name: "Cart 2" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears a proposed bundle when the mission constraints change", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input) === "/api/shopping-missions"
        ? jsonResponse({ plan: missionPlan() })
        : jsonResponse(listResponse([product])),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });

    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "50");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));
    expect(
      await screen.findByRole("button", { name: "Add bundle to cart" }),
    ).toBeVisible();

    await user.clear(screen.getByLabelText("Budget (dollars)"));
    await user.type(screen.getByLabelText("Budget (dollars)"), "20");

    expect(
      screen.queryByRole("button", { name: "Add bundle to cart" }),
    ).toBeNull();
  });

  it("merges a mission bundle into the cart without exceeding quantity limits", async () => {
    const plan = missionPlan(20, []);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input) === "/api/shopping-missions"
        ? jsonResponse({ plan })
        : jsonResponse(listResponse([product])),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "500");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));
    await user.click(
      await screen.findByRole("button", { name: "Add bundle to cart" }),
    );

    expect(screen.getByRole("link", { name: "Cart 20" })).toBeVisible();
    expect(
      screen.getByText(
        "Bundle added with quantity limits applied. No product can exceed 20.",
      ),
    ).toBeVisible();
  });

  it.each([
    [
      "MISSION_PLANNER_NOT_CONFIGURED",
      "Basket planner is not configured",
    ],
    [
      "MISSION_PLANNER_UNAVAILABLE",
      "Basket planner is temporarily unavailable",
    ],
    ["MISSION_PROPOSAL_INVALID", "The proposed basket was invalid"],
    ["INTERNAL_ERROR", "We could not build your basket"],
  ])("shows the %s mission error state", async (code, title) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input) === "/api/shopping-missions"
        ? jsonResponse({ error: { code, message: "Server detail" } }, 503)
        : jsonResponse(listResponse([product])),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });
    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "50.00");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));

    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add bundle to cart" })).toBeNull();
  });

  it("ignores a cancelled mission response that arrives late", async () => {
    let resolveMission: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/shopping-missions") {
        return new Promise<Response>((resolve) => {
          resolveMission = resolve;
        });
      }
      return Promise.resolve(jsonResponse(listResponse([product])));
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });
    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "50");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));
    expect(
      screen.getByText("Building a basket for your shopping goal…"),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    resolveMission?.(jsonResponse({ plan: missionPlan() }));

    expect(await screen.findByText("Basket planning cancelled.")).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "A brighter campsite" }),
      ).toBeNull(),
    );
  });

  it("ignores an in-flight mission response after the constraints change", async () => {
    let resolveMission: ((response: Response) => void) | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) === "/api/shopping-missions") {
        return new Promise<Response>((resolve) => {
          resolveMission = resolve;
        });
      }
      return Promise.resolve(jsonResponse(listResponse([product])));
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: product.name });
    await user.type(screen.getByLabelText("Shopping goal"), "Light a campsite");
    await user.type(screen.getByLabelText("Budget (dollars)"), "50");
    await user.click(screen.getByRole("button", { name: "Build my basket" }));
    expect(
      screen.getByText("Building a basket for your shopping goal…"),
    ).toBeVisible();

    await user.clear(screen.getByLabelText("Budget (dollars)"));
    await user.type(screen.getByLabelText("Budget (dollars)"), "20");
    resolveMission?.(jsonResponse({ plan: missionPlan() }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "A brighter campsite" }),
      ).toBeNull(),
    );
    expect(
      screen.queryByText("Building a basket for your shopping goal…"),
    ).toBeNull();
  });
});
