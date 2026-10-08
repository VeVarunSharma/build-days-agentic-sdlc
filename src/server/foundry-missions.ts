import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import type { Product, ShoppingMissionRequest } from "../shared/contracts.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const CLEANUP_TIMEOUT_MS = 2_000;
const MAX_CATALOGUE_PRODUCTS = 100;
const MAX_PROMPT_CHARACTERS = 24_000;
const MAX_RESPONSE_CHARACTERS = 32_000;
type FoundryOpenAIClient = ReturnType<AIProjectClient["getOpenAIClient"]>;

export interface ShoppingMissionPlanner {
  plan(
    mission: ShoppingMissionRequest,
    products: Product[],
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export class ShoppingMissionPlannerUnconfiguredError extends Error {
  constructor() {
    super("Shopping mission planning is not configured.");
    this.name = "ShoppingMissionPlannerUnconfiguredError";
  }
}

export class ShoppingMissionPlannerUnavailableError extends Error {
  constructor() {
    super("Shopping mission planning is temporarily unavailable.");
    this.name = "ShoppingMissionPlannerUnavailableError";
  }
}

export class ShoppingMissionPlannerInvalidResponseError extends Error {
  constructor() {
    super("The shopping mission response was invalid.");
    this.name = "ShoppingMissionPlannerInvalidResponseError";
  }
}

interface FoundryShoppingMissionPlannerOptions {
  endpoint?: string;
  agentName?: string;
  timeoutMs?: number;
}

const createPrompt = (
  mission: ShoppingMissionRequest,
  products: Product[],
): string => {
  const availableProducts = products.slice(0, MAX_CATALOGUE_PRODUCTS).map(
    ({ id, name, category, priceCents, availability, shortDescription }) => ({
      id,
      name,
      category,
      priceCents,
      availability,
      shortDescription: shortDescription.slice(0, 300),
    }),
  );
  const prompt = [
    "Create a shopping mission proposal using only the supplied catalogue.",
    "Return exactly one JSON object with no Markdown or surrounding text.",
    'Use keys "title", "summary", "items", and "limitations".',
    'Each item must have "productId", integer "quantity", and "reason".',
    "Respect the budget and maximum item count.",
    JSON.stringify({ mission, availableProducts }),
  ].join("\n");

  if (prompt.length > MAX_PROMPT_CHARACTERS) {
    throw new ShoppingMissionPlannerUnavailableError();
  }
  return prompt;
};

export class FoundryShoppingMissionPlanner implements ShoppingMissionPlanner {
  private readonly endpoint?: string;
  private readonly agentName?: string;
  private readonly timeoutMs: number;

  constructor(options: FoundryShoppingMissionPlannerOptions = {}) {
    this.endpoint = options.endpoint ?? process.env.FOUNDRY_PROJECT_ENDPOINT;
    this.agentName = options.agentName ?? process.env.FOUNDRY_AGENT_NAME;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async plan(
    mission: ShoppingMissionRequest,
    products: Product[],
    callerSignal?: AbortSignal,
  ): Promise<unknown> {
    if (!this.endpoint?.trim() || !this.agentName?.trim()) {
      throw new ShoppingMissionPlannerUnconfiguredError();
    }
    return this.invokeFoundry(mission, products, callerSignal);
  }

  private async invokeFoundry(
    mission: ShoppingMissionRequest,
    products: Product[],
    callerSignal?: AbortSignal,
  ): Promise<unknown> {
    const credential = new DefaultAzureCredential();
    const project = new AIProjectClient(this.endpoint!, credential);
    const openAIClient = project.getOpenAIClient();
    const timeoutMs = Math.min(Math.max(this.timeoutMs, 1_000), 30_000);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    let conversationId: string | undefined;
    try {
      conversationId = await this.createConversation(
        openAIClient,
        createPrompt(mission, products),
        signal,
      );
      return await this.createResponse(openAIClient, conversationId, signal);
    } catch (error) {
      if (
        error instanceof ShoppingMissionPlannerInvalidResponseError ||
        error instanceof ShoppingMissionPlannerUnavailableError
      ) {
        throw error;
      }
      throw new ShoppingMissionPlannerUnavailableError();
    } finally {
      await this.cleanup(openAIClient, conversationId);
    }
  }

  private async createConversation(
    client: FoundryOpenAIClient,
    prompt: string,
    signal: AbortSignal,
  ): Promise<string> {
    const conversation = await client.conversations.create(
      {
        items: [{ type: "message", role: "user", content: prompt }],
      },
      { signal },
    );
    return conversation.id;
  }

  private async createResponse(
    client: FoundryOpenAIClient,
    conversationId: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    const response = await client.responses.create(
      { conversation: conversationId },
      {
        body: {
          agent: { name: this.agentName!, type: "agent_reference" },
        },
        signal,
      },
    );
    const output = response.output_text;
    if (
      typeof output !== "string" ||
      output.length === 0 ||
      output.length > MAX_RESPONSE_CHARACTERS
    ) {
      throw new ShoppingMissionPlannerInvalidResponseError();
    }
    try {
      return JSON.parse(output) as unknown;
    } catch {
      throw new ShoppingMissionPlannerInvalidResponseError();
    }
  }

  private async cleanup(
    client: FoundryOpenAIClient,
    conversationId?: string,
  ): Promise<void> {
    if (!conversationId) {
      return;
    }
    try {
      await client.conversations.delete(conversationId, {
        signal: AbortSignal.timeout(CLEANUP_TIMEOUT_MS),
      });
    } catch {
      // Best-effort cleanup must not replace the request result.
    }
  }
}
