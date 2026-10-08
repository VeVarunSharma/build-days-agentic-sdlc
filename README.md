# Build Days: Issue-first Agentic SDLC

This four-hour GitHub Copilot App workshop uses **Babazon.com**, a fictional
React and Express storefront. Teams deliver one outcome:

> A shopper can browse the catalogue, search by product text, filter by
> category, clear filters, and understand loading, empty, error, and result
> states.

```text
parent issue -> reviewed Copilot App Plan -> four bounded child issues
-> isolated sessions/worktrees -> pull requests -> deterministic evidence
```

## Start here

Complete the labs in order:

| Lab | Outcome |
|---|---|
| [1. Frame the outcome](docs/labs/01-outcome-and-plan.md) | Create the parent issue, review the Plan, and define four bounded child issues. |
| [2. Implement bounded tasks](docs/labs/02-multi-agent-orchestration.md) | Stabilize foundations, then use isolated sessions and Fleet safely. |
| [3. Integrate and prove](docs/labs/03-build-test-deploy.md) | Integrate the work and collect local, CI, and browser evidence. |
| [4. Run the Foundry mission planner](docs/labs/04-foundry-mission-planner.md) | Provision, deploy, invoke, and connect the Babazon prompt agent. |
| [5. Remediate CodeQL](docs/labs/05-gh-aw.md) | Fix the deterministic security exercise; keep GH-AW as stretch work. |
| [Wrap up](docs/labs/workshop-wrap-and-evidence.md) | Build the final evidence chain and handoff. |

## Optional capstone

After the core workshop, teams may build any useful agentic application in the
[open agentic capstone](docs/labs/06-open-agentic-capstone.md). Extend Babazon
or create `capstone/<app-name>/` with the existing TypeScript stack.

The capstone is not issue-first. Teams use Copilot App Explore, Plan,
Interactive, and Fleet deliberately, then deploy one Microsoft Foundry prompt
agent and integrate it through the server into a real user-facing flow. See the
[`capstone/` contract](capstone/README.md).

## Prompt-card pattern

Each lab uses the same five fields:

- **Use:** the Copilot App mode or GitHub surface.
- **Attach:** the minimum context required.
- **Prompt:** the bounded instruction.
- **Expect:** the observable result.
- **Decide:** the human review decision before continuing.

## Application and validation

Babazon uses deterministic product data and a client-side cart. The Express
process serves the API and production client bundle.

```powershell
npm ci
npx playwright install chromium firefox webkit
npm run check
```

Required endpoints are `/health`, `/ready`, `/api/products`, and
`/api/products/:id`.

Azure App Service deployment remains optional advanced work. Lab 4 uses the
checked-in `foundry/` project; teams provision their own environment or use the
organizer fallback only when provisioning is recorded as unavailable. App
Service configuration is documented in [`infra/README.md`](infra/README.md).

Babazon.com is fictional and uses an original visual identity. Do not copy
Amazon branding, assets, page design, text, or trade dress.
