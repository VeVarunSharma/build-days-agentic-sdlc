# Open agentic capstone

The optional capstone lets teams build any useful agentic application while
reusing the repository's engineering patterns.

Choose one path:

1. **Extend Babazon** with a new Foundry-backed shopper or operator workflow.
2. **Create a new application** under `capstone/<app-name>/`.

The domain is open. The required stack is TypeScript, React, Express, Zod,
Vitest, Testing Library, and Playwright. The capstone must deploy one Microsoft
Foundry prompt agent and integrate it into a real user-facing flow through a
server-side Entra-authenticated boundary.

## Minimum definition of done

- A useful agentic problem with an ambiguous input and bounded result.
- A reviewed Copilot App Plan summarized in the application README.
- One stable shared contract before Fleet starts.
- One meaningful Interactive steering receipt.
- Two to four non-overlapping Fleet tasks and an integration receipt.
- One deployed Foundry prompt agent and a real invocation.
- Deterministic validation before model output can trigger application state.
- Accessible loading, validation, unavailable, invalid-output, success, and
  recovery states.
- Unit, API, UI, and Playwright evidence.
- Demo evidence, known limitations, and a named Azure cleanup owner.

GitHub issues are optional. A four-child issue graph is not required.

## Application README

Each `capstone/<app-name>/README.md` records:

- user problem and agent-fit rationale;
- Plan summary, decisions, and non-goals;
- Interactive and Fleet receipts;
- Foundry project, model deployment, and agent names without secrets;
- request, untrusted model-output, and canonical application contracts;
- exact validation commands and results;
- screenshot or recording of the user-facing flow;
- limitations, recovery behavior, and cleanup owner.

Do not add completed capstone solutions or answer keys to the public starter.
Read [`AGENTS.md`](AGENTS.md) before creating a capstone application.
