# Babazon shopping mission prompt agent

This folder is a checked-in, public-network **Basic Agent Setup** scaffold based
on Microsoft's Foundry basic-agent Bicep sample. It provisions only:

- one `AIServices` account with local authentication disabled;
- one Foundry project;
- one configurable chat-model deployment.

It does not provision a hosted agent, container registry, Docker workload,
capability host, search, grounding, or credentials. Model availability and
quota are subscription- and region-specific; the defaults are intentionally
small but are not a quota claim.

## Local workflow

1. Review `agent/instructions.template.md` and the fixed scenarios in
   `evals/scenarios.json`.
2. Set `AZURE_PRINCIPAL_ID` to the signed-in participant's Microsoft Entra
   object ID. Provisioning assigns that identity the `Foundry User` role at the
   new project scope so prompt-agent deployment and invocation use Entra ID.
3. Provision only after a human selects an Azure subscription, region, and
   resource group:

   ```powershell
   azd provision
   ```

4. Export the azd outputs into the current shell, then render and deploy the
   prompt agent:

   ```powershell
   npm run foundry:render
   npm run foundry:deploy-agent
   ```

The deployment uses `DefaultAzureCredential` and creates a prompt-agent version
with no tools. `FOUNDRY_PROJECT_ENDPOINT` and
`AZURE_AI_MODEL_DEPLOYMENT_NAME` are required; `FOUNDRY_AGENT_NAME` defaults to
`babazon-mission-planner`.
