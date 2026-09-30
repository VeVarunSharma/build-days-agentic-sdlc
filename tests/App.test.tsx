// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/client/App.js";
import type { Feedback } from "../src/shared/contracts.js";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("feedback board", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows an accessible empty state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ items: [] }));
    render(<App />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading feedback");
    expect(await screen.findByRole("heading", { name: "No feedback yet" })).toBeVisible();
  });

  it("creates feedback and votes through the complete UI flow", async () => {
    let item: Feedback | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const url = String(input);
      if (url === "/api/feedback" && !options?.method) {
        return jsonResponse({ items: [] });
      }
      if (url === "/api/feedback" && options?.method === "POST") {
        item = {
          id: "feedback-1",
          ...(JSON.parse(String(options.body)) as Omit<
            Feedback,
            "id" | "votes" | "createdAt"
          >),
          votes: 0,
          createdAt: "2025-01-01T00:00:00.000Z",
        };
        return jsonResponse({ feedback: item }, 201);
      }
      if (url.endsWith("/votes") && item) {
        item = { ...item, votes: 1 };
        return jsonResponse({ feedback: item, alreadyVoted: false }, 201);
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });

    await user.type(screen.getByLabelText("Title"), "Better examples");
    await user.type(
      screen.getByLabelText("Description"),
      "Show another API example.",
    );
    await user.selectOptions(screen.getByLabelText("Category"), "tooling");
    await user.type(screen.getByLabelText("Display name"), "Sam");
    await user.click(screen.getByRole("button", { name: "Add feedback" }));

    expect(
      await screen.findByRole("heading", { name: "Better examples" }),
    ).toBeVisible();
    const vote = screen.getByRole("button", {
      name: "Vote for Better examples. 0 votes",
    });
    await user.click(vote);
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Vote for Better examples. 1 votes",
        }),
      ).toBeVisible(),
    );
    expect(screen.getByText("Vote added for “Better examples”.")).toBeVisible();
  });

  it("looks up an author summary via manual lookup with the encoded name", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/feedback") {
        return jsonResponse({ items: [] });
      }
      if (url === "/api/authors/Sam%20O'Neil/summary") {
        return jsonResponse({
          summary: { displayName: "Sam O'Neil", itemCount: 2, totalVotes: 5 },
        });
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });

    await user.type(
      screen.getByLabelText("Look up a display name"),
      "Sam O'Neil",
    );
    await user.click(screen.getByRole("button", { name: "Look up" }));

    const summaryRegion = screen.getByRole("region", { name: "Author summary" });
    expect(await within(summaryRegion).findByText("Sam O'Neil")).toBeVisible();
    expect(within(summaryRegion).getByText("2")).toBeVisible();
    expect(within(summaryRegion).getByText("5")).toBeVisible();
  });

  it("opens the author summary from a feedback card's display name", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/feedback") {
        return jsonResponse({
          items: [
            {
              id: "feedback-1",
              title: "Better examples",
              description: "Show another API example.",
              category: "tooling",
              displayName: "Sam",
              votes: 3,
              createdAt: "2025-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (url === "/api/authors/Sam/summary") {
        return jsonResponse({
          summary: { displayName: "Sam", itemCount: 1, totalVotes: 3 },
        });
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Better examples" });

    await user.click(screen.getByRole("button", { name: "By Sam" }));

    const summaryRegion = screen.getByRole("region", { name: "Author summary" });
    expect(await within(summaryRegion).findByText("Sam")).toBeVisible();
    expect(within(summaryRegion).getByText("1")).toBeVisible();
    expect(within(summaryRegion).getByText("3")).toBeVisible();
  });

  it("renders a zero-valued author summary as a normal result, not an error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/feedback") {
        return jsonResponse({ items: [] });
      }
      if (url === "/api/authors/Nobody/summary") {
        return jsonResponse({
          summary: { displayName: "Nobody", itemCount: 0, totalVotes: 0 },
        });
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });

    await user.type(screen.getByLabelText("Look up a display name"), "Nobody");
    await user.click(screen.getByRole("button", { name: "Look up" }));

    const summaryRegion = screen.getByRole("region", { name: "Author summary" });
    expect(await within(summaryRegion).findByText("Nobody")).toBeVisible();
    const zeroCounts = within(summaryRegion).getAllByText("0");
    expect(zeroCounts).toHaveLength(2);
    expect(
      within(summaryRegion).queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("shows an author summary error with retry", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () => jsonResponse({ items: [] }))
      .mockImplementationOnce(async () => {
        throw new Error("The summary could not load.");
      })
      .mockImplementationOnce(async () =>
        jsonResponse({
          summary: { displayName: "Sam", itemCount: 1, totalVotes: 3 },
        }),
      );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });

    await user.type(screen.getByLabelText("Look up a display name"), "Sam");
    await user.click(screen.getByRole("button", { name: "Look up" }));

    expect(await screen.findByText("The summary could not load.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Sam")).toBeVisible();
  });

  it("shows server validation beside fields", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Check the highlighted fields and try again.",
              fieldErrors: { title: ["Enter a title."] },
            },
          },
          400,
        ),
      );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });
    await user.click(screen.getByRole("button", { name: "Add feedback" }));

    expect(await screen.findByText("Enter a title.")).toBeVisible();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
  });

  it("offers retry after a loading error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("The board could not load."))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText("The board could not load.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "No feedback yet" })).toBeVisible();
  });
});
