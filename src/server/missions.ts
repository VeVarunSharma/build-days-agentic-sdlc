import {
  promptAgentProposalSchema,
  shoppingMissionRequestSchema,
  type PromptAgentProposal,
  type ShoppingMissionRequest,
  type ValidatedMissionPlan,
  type ValidatedMissionPlanLine,
} from "../shared/contracts.js";
import {
  ProductNotFoundError,
  type ProductCatalogue,
} from "./catalogue.js";

export type MissionProposalValidationErrorCode =
  | "DUPLICATE_PRODUCT"
  | "UNKNOWN_PRODUCT"
  | "ITEM_LIMIT_EXCEEDED"
  | "BUDGET_EXCEEDED";

export class MissionProposalValidationError extends Error {
  constructor(
    readonly code: MissionProposalValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MissionProposalValidationError";
  }
}

const parseMissionRequest = (request: unknown): ShoppingMissionRequest =>
  shoppingMissionRequestSchema.parse(request);

const parseProposal = (proposal: unknown): PromptAgentProposal =>
  promptAgentProposalSchema.parse(proposal);

export const validateMissionProposal = async (
  requestInput: unknown,
  proposalInput: unknown,
  catalogue: ProductCatalogue,
): Promise<ValidatedMissionPlan> => {
  const mission = parseMissionRequest(requestInput);
  const proposal = parseProposal(proposalInput);
  const productIds = new Set<string>();

  for (const item of proposal.items) {
    if (productIds.has(item.productId)) {
      throw new MissionProposalValidationError(
        "DUPLICATE_PRODUCT",
        `Product ${item.productId} appears more than once.`,
      );
    }
    productIds.add(item.productId);
  }

  const itemCount = proposal.items.reduce((total, item) => total + item.quantity, 0);
  if (itemCount > mission.maxItems) {
    throw new MissionProposalValidationError(
      "ITEM_LIMIT_EXCEEDED",
      `Proposal contains ${itemCount} items, exceeding the limit of ${mission.maxItems}.`,
    );
  }

  const items: ValidatedMissionPlanLine[] = [];
  for (const item of proposal.items) {
    try {
      const product = await catalogue.getById(item.productId);
      items.push({
        product,
        quantity: item.quantity,
        reason: item.reason,
        lineTotalCents: product.priceCents * item.quantity,
      });
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw new MissionProposalValidationError(
          "UNKNOWN_PRODUCT",
          `Product ${item.productId} is not in the catalogue.`,
        );
      }
      throw error;
    }
  }

  const totalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
  if (totalCents > mission.budgetCents) {
    throw new MissionProposalValidationError(
      "BUDGET_EXCEEDED",
      `Proposal total of ${totalCents} cents exceeds the budget of ${mission.budgetCents} cents.`,
    );
  }

  return {
    mission,
    title: proposal.title,
    summary: proposal.summary,
    items,
    limitations: proposal.limitations,
    totalCents,
  };
};
