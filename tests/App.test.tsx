// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
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

describe("author summary panel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const summaryBody = (itemCount: number, totalVotes: number) => ({
    displayName: "Sam",
    itemCount,
    totalVotes,
  });

  it("announces loading then shows totals", async () => {
    let resolve!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) =>
      String(input).startsWith("/api/author-summary")
        ? new Promise<Response>((r) => (resolve = r))
        : Promise.resolve(jsonResponse({ items: [] })),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "No feedback yet" });
    await user.type(screen.getByLabelText("Author display name"), "Sam");
    expect(await screen.findByText("Loading summary…")).toBeVisible();
    resolve(jsonResponse(summaryBody(2, 5)));
    expect(await screen.findByText("Feedback items")).toBeVisible();
    expect(screen.getByText("Total votes").nextElementSibling).toHaveTextContent("5");
    expect(screen.getByText("Feedback items").nextElementSibling).toHaveTextContent("2");
    expect(fetch).toHaveBeenCalledWith(
      "/api/author-summary?displayName=Sam",
      expect.anything(),
    );
  });

  it("explains an empty result", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).startsWith("/api/author-summary")
        ? jsonResponse(summaryBody(0, 0))
        : jsonResponse({ items: [] }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Author display name"), "Sam");
    expect(await screen.findByText("No feedback found for Sam.")).toBeVisible();
  });

  it("shows an alert on error while the board stays usable", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).startsWith("/api/author-summary")
        ? jsonResponse(
            { error: { code: "SERVER_ERROR", message: "Summary unavailable." } },
            500,
          )
        : jsonResponse({ items: [] }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Author display name"), "Sam");
    expect(await screen.findByRole("alert")).toHaveTextContent("Summary unavailable.");
    expect(screen.getByRole("button", { name: "Add feedback" })).toBeEnabled();
  });

  it("refetches after posting feedback", async () => {
    let itemCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const url = String(input);
      if (url.startsWith("/api/author-summary")) {
        return jsonResponse(summaryBody(itemCount, 0));
      }
      if (options?.method === "POST") {
        itemCount = 1;
        return jsonResponse(
          {
            feedback: {
              id: "f1",
              title: "T",
              description: "D",
              category: "content",
              displayName: "Sam",
              votes: 0,
              createdAt: "2025-01-01T00:00:00.000Z",
            },
          },
          201,
        );
      }
      return jsonResponse({ items: [] });
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Author display name"), "Sam");
    expect(await screen.findByText("No feedback found for Sam.")).toBeVisible();
    await user.type(screen.getByLabelText("Title"), "T");
    await user.type(screen.getByLabelText("Description"), "D");
    await user.type(screen.getByLabelText("Display name"), "Sam");
    await user.click(screen.getByRole("button", { name: "Add feedback" }));
    await waitFor(() =>
      expect(screen.getByText("Feedback items").nextElementSibling).toHaveTextContent("1"),
    );
  });
});