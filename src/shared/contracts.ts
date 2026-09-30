import { z } from "zod";

export const feedbackCategories = [
  "content",
  "facilitation",
  "tooling",
  "idea",
] as const;

export const fieldLimits = {
  title: 100,
  description: 1_000,
  displayName: 60,
  clientId: 100,
} as const;

export const createFeedbackSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(fieldLimits.title),
  description: z
    .string()
    .trim()
    .min(1, "Enter a description.")
    .max(fieldLimits.description),
  category: z.enum(feedbackCategories),
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your display name.")
    .max(fieldLimits.displayName),
});

export const voteRequestSchema = z.object({
  clientId: z
    .string()
    .trim()
    .min(1, "A workshop client ID is required.")
    .max(fieldLimits.clientId)
    .regex(/^[A-Za-z0-9_-]+$/, "The workshop client ID is invalid."),
});

export const authorSummaryQuerySchema = z.object({
  displayName: z
    .string({ error: "Enter a display name." })
    .trim()
    .min(1, "Enter a display name.")
    .max(fieldLimits.displayName),
});

export type FeedbackCategory = (typeof feedbackCategories)[number];
export type CreateFeedbackRequest = z.infer<typeof createFeedbackSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;

export interface Feedback extends CreateFeedbackRequest {
  id: string;
  votes: number;
  createdAt: string;
}

export interface AuthorSummary {
  displayName: string;
  itemCount: number;
  totalVotes: number;
}

export const summarizeAuthor = (
  items: ReadonlyArray<Pick<Feedback, "displayName" | "votes">>,
  displayName: string,
): AuthorSummary =>
  items.reduce<AuthorSummary>(
    (summary, item) =>
      item.displayName === displayName
        ? {
            ...summary,
            itemCount: summary.itemCount + 1,
            totalVotes: summary.totalVotes + item.votes,
          }
        : summary,
    { displayName, itemCount: 0, totalVotes: 0 },
  );

export interface VoteResult {
  feedback: Feedback;
  alreadyVoted: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
