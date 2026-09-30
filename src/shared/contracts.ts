import { z } from "zod";

export const feedbackCategories = [
  "content",
  "facilitation",
  "tooling",
  "idea",
] as const;

export const feedbackSortModes = ["newest-first", "most-votes-first"] as const;
export const feedbackSortModeSchema = z.enum(feedbackSortModes);
export const defaultFeedbackSortMode = feedbackSortModes[0];

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

export type FeedbackCategory = (typeof feedbackCategories)[number];
export type FeedbackSortMode = (typeof feedbackSortModes)[number];
export type CreateFeedbackRequest = z.infer<typeof createFeedbackSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;

export interface Feedback extends CreateFeedbackRequest {
  id: string;
  votes: number;
  createdAt: string;
}

export interface VoteResult {
  feedback: Feedback;
  alreadyVoted: boolean;
}

export const compareFeedback = (
  a: Feedback,
  b: Feedback,
  sortMode: FeedbackSortMode = defaultFeedbackSortMode,
): number => {
  if (sortMode === "most-votes-first") {
    const voteOrder = b.votes - a.votes;
    if (voteOrder !== 0) {
      return voteOrder;
    }
  }

  const creationOrder = b.createdAt.localeCompare(a.createdAt);
  if (creationOrder !== 0) {
    return creationOrder;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
