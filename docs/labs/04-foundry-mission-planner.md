# Lab 4: Foundry mission planner

## Outcome

Provision the checked-in Foundry project, deploy its prompt agent, validate a
fixed shopping scenario, and use the result in the local Babazon cart.

## Prerequisites

- Labs 1–3 are complete and the current revision passes its focused checks.
- Azure CLI, Azure Developer CLI (`azd`), Node.js 20.19+, and an Azure identity
  are available.
- The identity may create resource-group deployments, Foundry projects, and
  model deployments in the selected subscription.

## Participant steps

**Use:** Copilot App Interactive mode. Use the Azure portal only to review the
selected resources or test the deployed prompt agent.

**Attach:** `foundry/README.md`, `foundry/azure.yaml`,
`foundry/infra/main.parameters.json`, `foundry/evals/scenarios.json`, and the
current terminal output.

**Prompt:** From the checked-in `foundry/` directory, verify Azure CLI and
`azd` readiness, authentication, and the active subscription with
`az --version`, `azd version`, and `az account show`. Create a unique
participant environment with `azd env new <unique-name>`. Show the subscription,
location, resource group, project name, model name/version, deployment name,
SKU, and capacity. Stop for my explicit review before running `azd provision`.
Do not change infrastructure defaults or provision anything I have not
approved.

**Expect:** A unique ignored `foundry/.azure/` environment and a reviewed
provisioning target. The App stops immediately on missing permissions or any
unsupported region, model, SKU, capacity, or quota result; it records the exact
error instead of retrying in another region or changing the model.

**Decide:** Approve provisioning only when the subscription, location,
resource group, names, model settings, expected cost, and cleanup owner are
correct.

**Use:** Copilot App Interactive mode after provisioning succeeds.

**Attach:** The successful `azd provision` output, environment values,
`foundry/agent/instructions.template.md`, and the fixed scenarios.

**Prompt:** Read the provisioned outputs into the current shell without
committing them. Return to the repository root, run `npm run foundry:render`,
review the generated instructions, then run `npm run foundry:deploy-agent` to
create or update
`babazon-mission-planner`. Invoke `smoke-reading-nook` from
`foundry/evals/scenarios.json` and validate strict JSON, catalogue-only product
IDs, budget, item-count, and limitations assertions. Report the real response
or the real failure.

**Expect:** A deployed agent name/version and a fixed-scenario response that
passes every listed assertion.

**Decide:** Continue only after the remote invocation succeeds. Unit tests,
mock responses, generated instructions, or a locally constructed bundle are
not evidence that Foundry worked.

**Use:** Copilot App Interactive mode with the local Babazon application.

**Attach:** The validated response plus the provisioned project endpoint and
deployed agent name.

**Prompt:** Set `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT_NAME` only in the
current shell or an ignored local environment file; never commit their values.
Start Babazon, open the application, enter the `smoke-reading-nook` goal,
budget, and item limit in **Build my basket**, submit it, verify the displayed
bundle against the catalogue and constraints, and add the validated bundle to
the cart.

**Expect:** The application calls the configured remote agent, displays a
validated bundle, and adds its available items and quantities to the cart.

**Decide:** Accept the lab only when the UI journey succeeds against the
deployed agent and the cart matches the validated bundle.

## Expected repository artifacts

- No committed environment values, generated instructions, or credentials.
- Evidence recording the reviewed settings, provision result, agent
  name/version, fixed-scenario assertions, UI result, and cart result.
- A cleanup plan naming the environment, resource group, owner, and planned
  `azd down` time.

## Verification

Ask the App to check `git status`, prove secrets and generated files remain
ignored, and produce one evidence table for provisioning, deployment,
invocation, UI validation, cart contents, and cleanup. Record failed or
unavailable gates exactly; do not replace remote evidence with local success.

## Recovery

Fail fast on permissions, policy, region/model availability, or quota. Preserve
the exact command and Azure error, mark participant provisioning
`capability-unavailable`, and stop. Use an organizer-provided endpoint and agent
only when the organizer has explicitly marked provisioning unavailable; record
its owner and cleanup boundary, then repeat remote invocation and the full UI
journey. Never present mocks, fixtures, or local-only tests as a fallback.

## Stretch

Run one additional regression scenario from `foundry/evals/scenarios.json`,
record its assertion results, and compare it with the smoke scenario without
changing the deployed model or instructions.
