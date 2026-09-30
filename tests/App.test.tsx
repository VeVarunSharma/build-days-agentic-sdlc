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

  it("requests the default and selected modes and exposes the selected mode", async () => {
    const newestFirst = [
      makeFeedback("newest", "Newest idea", 0, "2025-01-03T00:00:00.000Z"),
      makeFeedback("oldest", "Older idea", 2, "2025-01-01T00:00:00.000Z"),
    ];
    const mostVotesFirst = [...newestFirst].reverse();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) =>
        jsonResponse({
          items: String(input).includes("most-votes-first")
            ? mostVotesFirst
            : newestFirst,
        }),
    );
    const user = userEvent.setup();
    render(<App />);

    const sort = await screen.findByRole("combobox", { name: /sort/i });
    expect(sort).toHaveValue("newest-first");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/feedback");
    expect(cardTitles()).toEqual(["Newest idea", "Older idea"]);

    await user.selectOptions(sort, "most-votes-first");

    await waitFor(() => expect(sort).toHaveValue("most-votes-first"));
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "/api/feedback?sort=most-votes-first",
    );
    expect(cardTitles()).toEqual(["Older idea", "Newest idea"]);
  });

  it("retains displayed items and exposes busy state while a sort request loads", async () => {
    const firstItems = [
      makeFeedback("newest", "Newest idea", 0, "2025-01-03T00:00:00.000Z"),
      makeFeedback("older", "Older idea", 1, "2025-01-01T00:00:00.000Z"),
    ];
    const pending = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ items: firstItems }))
      .mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    render(<App />);
    const sort = await screen.findByRole("combobox", { name: /sort/i });

    await user.selectOptions(sort, "most-votes-first");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const board = screen.getByRole("region", { name: "Feedback" });
    expect(board).toHaveAttribute("aria-busy", "true");
    expect(cardTitles()).toEqual(["Newest idea", "Older idea"]);
    expect(screen.getByRole("status")).toHaveTextContent(/loading|updating/i);

    pending.resolve(jsonResponse({ items: [...firstItems].reverse() }));
    await waitFor(() => expect(board).toHaveAttribute("aria-busy", "false"));
    expect(cardTitles()).toEqual(["Older idea", "Newest idea"]);
  });

  it("ignores stale responses when sort modes are changed rapidly", async () => {
    const initialItems = [
      makeFeedback("item-a", "Initial A", 1, "2025-01-02T00:00:00.000Z"),
      makeFeedback("item-b", "Initial B", 0, "2025-01-01T00:00:00.000Z"),
    ];
    const staleResponse = deferred<Response>();
    const currentResponse = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ items: initialItems }))
      .mockReturnValueOnce(staleResponse.promise)
      .mockReturnValueOnce(currentResponse.promise);
    const user = userEvent.setup();
    render(<App />);
    const sort = await screen.findByRole("combobox", { name: /sort/i });

    await user.selectOptions(sort, "most-votes-first");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await user.selectOptions(sort, "newest-first");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    currentResponse.resolve(
      jsonResponse({
        items: [
          makeFeedback("latest", "Latest requested response", 0),
          makeFeedback("other", "Other latest item", 0),
        ],
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Latest requested response",
      }),
    ).toBeVisible();

    staleResponse.resolve(
      jsonResponse({
        items: [
          makeFeedback("stale", "Stale response", 8),
          makeFeedback("stale-other", "Other stale item", 1),
        ],
      }),
    );
    await waitFor(() => expect(sort).toHaveValue("newest-first"));
    expect(cardTitles()).toEqual([
      "Latest requested response",
      "Other latest item",
    ]);
    expect(
      screen.queryByRole("heading", { name: "Stale response" }),
    ).not.toBeInTheDocument();
  });

  it("rolls back a failed sort request and announces an accessible error", async () => {
    const initialItems = [
      makeFeedback("newest", "Newest idea", 0, "2025-01-03T00:00:00.000Z"),
      makeFeedback("older", "Older idea", 1, "2025-01-01T00:00:00.000Z"),
    ];
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ items: initialItems }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "Could not load feedback.",
            },
          },
          500,
        ),
      );
    const user = userEvent.setup();
    render(<App />);
    const sort = await screen.findByRole("combobox", { name: /sort/i });

    await user.selectOptions(sort, "most-votes-first");

    const error = await screen.findByText("Could not load feedback.");
    expect(sort).toHaveValue("newest-first");
    expect(cardTitles()).toEqual(["Newest idea", "Older idea"]);
    expect(error.closest('[aria-live="polite"], [role="alert"]')).not.toBeNull();
  });

  it("reorders created and voted feedback in the selected mode", async () => {
    let created: Feedback | undefined;
    let candidate: Feedback | undefined;
    const popular = makeFeedback(
      "popular",
      "Popular idea",
      2,
      "2025-01-01T00:00:00.000Z",
    );
    const candidateInitial = makeFeedback(
      "candidate",
      "Candidate idea",
      1,
      "2025-01-02T00:00:00.000Z",
    );
    candidate = candidateInitial;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const url = String(input);
      if (url.startsWith("/api/feedback?")) {
        return jsonResponse({
          items: url.includes("most-votes-first")
            ? [popular, candidateInitial]
            : [candidateInitial, popular],
        });
      }
      if (url === "/api/feedback" && options?.method === "POST") {
        created = {
          id: "new",
          ...(JSON.parse(String(options.body)) as Omit<
            Feedback,
            "id" | "votes" | "createdAt"
          >),
          votes: 0,
          createdAt: "2025-01-03T00:00:00.000Z",
        };
        return jsonResponse({ feedback: created }, 201);
      }
      if (url === "/api/feedback/candidate/votes" && candidate) {
        candidate = { ...candidate, votes: 2 };
        return jsonResponse(
          { feedback: candidate, alreadyVoted: false },
          201,
        );
      }
      return jsonResponse({}, 404);
    });
    const user = userEvent.setup();
    render(<App />);
    const sort = await screen.findByRole("combobox", { name: /sort/i });
    await user.selectOptions(sort, "most-votes-first");
    await screen.findByRole("heading", { name: "Popular idea" });

    await user.type(screen.getByLabelText("Title"), "New idea");
    await user.type(screen.getByLabelText("Description"), "A new suggestion.");
    await user.type(screen.getByLabelText("Display name"), "Sam");
    await user.click(screen.getByRole("button", { name: "Add feedback" }));

    await screen.findByRole("heading", { name: "New idea" });
    expect(created).toBeDefined();
    expect(sort).toHaveValue("most-votes-first");
    expect(cardTitles()).toEqual([
      "Popular idea",
      "Candidate idea",
      "New idea",
    ]);

    await user.click(
      screen.getByRole("button", {
        name: "Vote for Candidate idea. 1 votes",
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Vote for Candidate idea. 2 votes",
        }),
      ).toBeVisible(),
    );
    expect(cardTitles()).toEqual([
      "Candidate idea",
      "Popular idea",
      "New idea",
    ]);
    expect(sort).toHaveValue("most-votes-first");
  });
});

function cardTitles(): string[] {
  return within(screen.getByRole("list"))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent ?? "");
}

function makeFeedback(
  id: string,
  title: string,
  votes: number,
  createdAt = "2025-01-01T00:00:00.000Z",
): Feedback {
  return {
    id,
    title,
    description: `${title} description`,
    category: "idea",
    displayName: "Participant",
    votes,
    createdAt,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
