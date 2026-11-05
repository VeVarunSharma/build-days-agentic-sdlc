# Build Days: Issue-first Agentic SDLC

Use the Copilot App to deliver one outcome across two Babazon repositories:
product search and category filtering through a separate catalogue service.

The storefront already works with local data. The service starter supports
browse/detail. Learners add service queries and connect the existing storefront.

## Pre-work

1. Use the instructor-approved [starter pair](https://github.com/VeVarunSharma/build-days-agentic-sdlc/issues/34#issuecomment-6646983104).
   Do not start from a pair marked **candidate**.
2. Fork this app or open your assigned repo. Create your own repo with **Use this
   template** on the [catalogue starter](https://github.com/VeVarunSharma/babazon-catalogue-service).
   Record both source SHAs and both copies' starting commits.
3. Confirm Git, Node.js >=20.19, npm, GitHub CLI, and Copilot App access.
   Enable Issues and Actions in both copies.
4. Confirm Projects, an available Fusion effort level, and the QA workflow's
   permitted Copilot inference/billing path. Do not add long-lived credentials.
   A forecast with no sampled runs means unknown cost, not free execution.
5. In **Projects > +**, add both participant repos. Select **Copilot Fusion**;
   use Fusion High when available. Start with Lab 1's read-only prompt.

Run `npm ci` and `npm run check` in each repo. In the app, first install browsers:

```powershell
npx playwright install chromium firefox webkit
```

Install the pinned QA tooling before Lab 5:

```powershell
gh extension install github/gh-aw --pin v1.0.1 --force
gh aw version
```

Record unavailable capabilities honestly. An instructor's real run can support
discussion, but it does not count as your own execution.

## Labs

| Lab | Outcome |
|---|---|
| [1. Frame the outcome](docs/labs/01-outcome-and-plan.md) | Try Fusion; review the Plan and four tasks. |
| [2. Implement bounded tasks](docs/labs/02-multi-agent-orchestration.md) | Let the Project coordinate service and app sessions. |
| [3. Integrate and prove](docs/labs/03-build-test-deploy.md) | Verify the real service boundary and both commits. |
| [4. Revise cloud-agent work](docs/labs/04-cloud-agent.md) | Request and review one narrow revision. |
| [5. Automate QA](docs/labs/05-gh-aw.md) | Triage a failed test with GA Agentic Workflows. |
| [Wrap up](docs/labs/workshop-wrap-and-evidence.md) | Leave a traceable handoff. |

Each prompt card states **Use**, **Attach**, **Prompt**, **Expect**, and **Decide**.
Follow [AGENTS.md](AGENTS.md) for workflow rules and [DESIGN.md](DESIGN.md) for
architecture. Fleet is optional; the Project is the main coordinator.

## Instructor preparation

<details>
<summary>Prepare and check a fresh pair before learner edits</summary>

Take the SHAs from the starter-pair receipt. Replace the owner/repo placeholders:

```powershell
.\scripts\prepare-team-repo.ps1 `
  -Organization YOUR-OWNER -Repository YOUR-APP `
  -TemplateRepository VeVarunSharma/build-days-agentic-sdlc `
  -TemplateRevision APP_SOURCE_SHA `
  -CatalogueRepository YOUR-OWNER/YOUR-CATALOGUE `
  -CatalogueTemplateRevision SERVICE_SOURCE_SHA `
  -TeamSize 2 -TeamId team01 -Confirmation PREPARE -DryRun

.\scripts\verify-env.ps1 `
  -Repository YOUR-OWNER/YOUR-APP -ExpectedRevision APP_SOURCE_SHA `
  -CatalogueRepository YOUR-OWNER/YOUR-CATALOGUE `
  -CatalogueExpectedRevision SERVICE_SOURCE_SHA
```

Review the dry-run, then omit `-DryRun` to seed issues. Preparation rejects
pre-solved starters; these restrictions do not belong in learner CI.
Template copies have new history, so provenance compares tree contents.
App/Project/Fusion checks remain manual.

Local participation needs no Azure account. Advanced Azure checks require
`-IncludeAzure` and the assigned OIDC/scope settings; see
[infra/README.md](infra/README.md). Bash preflight has equivalent arguments.
</details>

## References

Fusion chooses models within a task; Projects coordinates work; GH-AW runs in Actions.

- [Fusion guide](https://docs.github.com/en/copilot/concepts/models/copilot-fusion),
  [HydraFusion background](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/),
  and [Copilot Benchmarks](https://benchmarks.github.com/): compare methodology,
  quality, and cost, not promises for one task.
- [Copilot App releases](https://github.blog/changelog/2026-10-28-github-copilot-app-universe-releases/)
  and [Projects guide](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-projects):
  Projects is public preview, not a GitHub Projects board.
- [Agentic Workflows GA](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/)
  and [setup guide](https://github.github.com/gh-aw/setup/quick-start/):
  verify account access and policy before running.

Babazon is fictional. Do not copy Amazon branding, assets, text, or trade dress.
