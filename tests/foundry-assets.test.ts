import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { products } from "../src/server/catalogue.js";
import {
  foundryInstructionsPath,
  renderFoundryInstructions,
} from "../scripts/render-foundry-instructions.js";

describe("Foundry shopping mission assets", () => {
  it("renders a deterministic grounded prompt", async () => {
    const first = await renderFoundryInstructions();
    const second = await renderFoundryInstructions();

    expect(first).toBe(second);
    expect(first).toContain("Return exactly one JSON object");
    expect(first).toContain("Never invent");
    expect(first).not.toContain("{{PRODUCT_CATALOGUE}}");
    for (const product of products) {
      expect(first.match(new RegExp(`"id":"${product.id}"`, "g"))).toHaveLength(
        1,
      );
    }
  });

  it("does not commit generated instructions or azd environment state", () => {
    const ignore = readFileSync(resolve("foundry", ".gitignore"), "utf8");
    expect(ignore).toContain(".azure/");
    expect(ignore).toContain("instructions.generated.md");
    expect(foundryInstructionsPath).toContain("instructions.generated.md");
  });

  it("declares a prompt-only project and configurable model", () => {
    const bicep = readFileSync(resolve("foundry", "infra", "main.bicep"), "utf8");
    const azureYaml = readFileSync(resolve("foundry", "azure.yaml"), "utf8");

    expect(bicep).toContain("Microsoft.CognitiveServices/accounts/projects");
    expect(bicep).toContain("param modelName string");
    expect(bicep).toContain("param principalId string");
    expect(bicep).toContain("53ca6127-db72-4b80-b1b0-d745d6d5456d");
    expect(bicep).toContain("scope: project");
    expect(bicep).toContain("disableLocalAuth: true");
    expect(bicep).not.toMatch(/container|capabilityHost|search/i);
    expect(azureYaml).not.toContain("azure.ai.agent");
  });
});
