import { z } from "zod";

export const productCategories = [
  "home",
  "outdoors",
  "office",
  "kitchen",
] as const;

export const fieldLimits = {
  search: 80,
  quantity: 20,
  missionGoal: 500,
  missionBudgetCents: 1_000_000,
  missionMaxItems: 20,
  proposalTitle: 120,
  proposalSummary: 500,
  proposalReason: 300,
  proposalLimitations: 10,
  proposalLimitation: 200,
} as const;

export const productQuerySchema = z.object({
  q: z.string().trim().max(fieldLimits.search).optional().default(""),
  category: z.enum(productCategories).optional(),
});

export const cartQuantitySchema = z.object({
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(fieldLimits.quantity, `Quantity cannot exceed ${fieldLimits.quantity}.`),
});

export const shoppingMissionRequestSchema = z
  .object({
    goal: z.string().trim().min(1, "Goal is required.").max(fieldLimits.missionGoal),
    budgetCents: z
      .number()
      .int("Budget must be a whole number of cents.")
      .min(1, "Budget must be at least 1 cent.")
      .max(fieldLimits.missionBudgetCents),
    maxItems: z
      .number()
      .int("Maximum items must be a whole number.")
      .min(1, "Maximum items must be at least 1.")
      .max(fieldLimits.missionMaxItems),
  })
  .strict();

export const promptAgentProposalSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(fieldLimits.proposalTitle),
    summary: z
      .string()
      .trim()
      .min(1, "Summary is required.")
      .max(fieldLimits.proposalSummary),
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1, "Product ID is required.").max(100),
            quantity: z
              .number()
              .int("Quantity must be a whole number.")
              .min(1, "Quantity must be at least 1.")
              .max(
                fieldLimits.quantity,
                `Quantity cannot exceed ${fieldLimits.quantity}.`,
              ),
            reason: z
              .string()
              .trim()
              .min(1, "Reason is required.")
              .max(fieldLimits.proposalReason),
          })
          .strict(),
      )
      .min(1, "At least one product is required.")
      .max(fieldLimits.missionMaxItems),
    limitations: z
      .array(z.string().trim().min(1).max(fieldLimits.proposalLimitation))
      .max(fieldLimits.proposalLimitations),
  })
  .strict();

export type ProductCategory = (typeof productCategories)[number];
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ShoppingMissionRequest = z.infer<typeof shoppingMissionRequestSchema>;
export type PromptAgentProposal = z.infer<typeof promptAgentProposalSchema>;

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ProductCategory;
  priceCents: number;
  rating: number;
  reviewCount: number;
  availability: "in-stock" | "limited";
  badge?: string;
  features: string[];
  accent: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  query: ProductQuery;
  categories: ProductCategory[];
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface ValidatedMissionPlanLine {
  product: Product;
  quantity: number;
  reason: string;
  lineTotalCents: number;
}

export interface ValidatedMissionPlan {
  mission: ShoppingMissionRequest;
  title: string;
  summary: string;
  items: ValidatedMissionPlanLine[];
  limitations: string[];
  totalCents: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}
