# Capstone agent guide

This subtree supports an optional open-domain capstone. Inside a named
`capstone/<app-name>/` subtree, the reviewed Copilot App Plan and mode/Fleet
receipts replace the core workshop's issue-first four-child graph.

## Boundaries

- Use TypeScript, React, Express, Zod, Vitest, Testing Library, and Playwright.
- Keep application source, tests, Foundry instructions, evaluation scenarios,
  and local documentation under the named subtree wherever tooling permits.
- Stabilize shared request, untrusted model-output, and canonical application
  contracts before Fleet begins.
- Give every Fleet task explicit dependencies, owned paths, and prohibited
  paths. Ownership must not overlap.
- Assign one integration owner for root dependencies, workflows,
  infrastructure, or shared Babazon files.
- Extending Babazon must preserve its existing catalogue, cart, checkout,
  mission planner, operational endpoints, and tests.

## Foundry and security

- Deploy one prompt agent and invoke it only from the server.
- Use `DefaultAzureCredential` locally and managed identity when deployed.
- Never expose credentials, tokens, project secrets, or privileged endpoints to
  browser code.
- Treat all model output as untrusted and validate it before display, action, or
  state mutation.
- Do not add hosted/container agents, search, grounding, memory, multi-agent
  workflows, new frameworks, sensitive data, real payments, or destructive
  autonomous actions without a separately reviewed repository change.
- Mocks and fixtures are test tools, not evidence that Foundry was deployed.

## Evidence

The application README is the capstone receipt. It records the reviewed Plan,
Interactive steering, Fleet ownership, exact test output, deployed-agent
invocation, application demo, limitations, recovery behavior, and cleanup
owner. Do not report completion without deterministic tests and real Foundry
evidence.
