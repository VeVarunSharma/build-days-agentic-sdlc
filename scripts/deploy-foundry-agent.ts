import { readFile } from "node:fs/promises";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import { foundryInstructionsPath } from "./render-foundry-instructions.js";

const projectEndpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
const modelDeployment = process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME;
const agentName = process.env.FOUNDRY_AGENT_NAME ?? "babazon-mission-planner";

if (!projectEndpoint || !modelDeployment) {
  throw new Error(
    "FOUNDRY_PROJECT_ENDPOINT and AZURE_AI_MODEL_DEPLOYMENT_NAME are required.",
  );
}

const instructions = await readFile(foundryInstructionsPath, "utf8");
const project = new AIProjectClient(
  projectEndpoint,
  new DefaultAzureCredential(),
);
const agent = await project.agents.createVersion(agentName, {
  kind: "prompt",
  model: modelDeployment,
  instructions,
});

console.log(
  JSON.stringify({
    name: agent.name,
    version: agent.version,
    modelDeployment,
  }),
);
