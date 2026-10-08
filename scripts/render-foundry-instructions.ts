import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { products } from "../src/server/catalogue.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const foundryTemplatePath = resolve(
  root,
  "foundry",
  "agent",
  "instructions.template.md",
);
export const foundryInstructionsPath = resolve(
  root,
  "foundry",
  "agent",
  "instructions.generated.md",
);

export const renderFoundryInstructions = async (): Promise<string> => {
  const template = await readFile(foundryTemplatePath, "utf8");
  const catalogue = products
    .map((product) =>
      JSON.stringify({
        id: product.id,
        name: product.name,
        category: product.category,
        priceCents: product.priceCents,
        availability: product.availability,
        shortDescription: product.shortDescription,
        features: product.features,
      }),
    )
    .join("\n");

  return template.replace("{{PRODUCT_CATALOGUE}}", catalogue);
};

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const instructions = await renderFoundryInstructions();
  await writeFile(foundryInstructionsPath, instructions, "utf8");
  console.log(`Rendered ${foundryInstructionsPath}`);
}
