# Build Days: Issue-first Agentic SDLC

This four-hour GitHub Copilot App workshop uses **Babazon.com**, a fictional
React and Express storefront, plus a separate catalogue microservice. Teams
deliver one outcome across two repositories:

> A shopper can browse the catalogue, search by product text, filter by
> category, and clear filters through the catalogue service, with clear loading,
> empty, error, and result states.

The storefront already does this with local data. Your work is to add queries
to the service and connect the existing storefront, not rebuild the UI.

```text
parent issue -> reviewed Copilot App Plan -> four bounded child issues
-> isolated sessions across two repos -> pull requests -> deterministic evidence
```

## Start here

1. **Get both repos.** Fork this app or open your assigned team repository.
   From the public
   [catalogue-service template](https://github.com/VeVarunSharma/babazon-catalogue-service),
   choose **Use this template > Create a new repository**. Use your own copy,
   not the instructor's template, for service changes.
2. **Create a Copilot Project.** In the App sidebar, choose **Projects > +**,
   add both participant-owned repositories, and give the Project the shared
   goal above. Projects is in public preview; it is not a GitHub Projects board.
3. **Try Copilot Fusion first.** Select **Copilot Fusion** in the model picker,
   using **Fusion High** if your plan/policy permits. Run Lab 1's read-only
   opening prompt before implementation.
4. **Check the starters.** Run the commands below in each repo and enable
   Issues and Actions. Record the two approved source revisions and your copies'
   starting commits on the parent issue.

Fusion selects models and execution patterns within a task. A Project
coordinates the goal across repositories and sessions. Fleet runs ready,
bounded tasks in parallel. GitHub Agentic Workflows (GH-AW) automates work in
GitHub Actions, independently of App Project automations.

Complete the labs in order:

| Lab | Outcome |
|---|---|
| [1. Frame the outcome](docs/labs/01-outcome-and-plan.md) | Try Fusion, set up the Project, and review four cross-repo child issues. |
| [2. Implement bounded tasks](docs/labs/02-multi-agent-orchestration.md) | Stabilize the service contract, then coordinate service and app sessions. |
| [3. Integrate and prove](docs/labs/03-build-test-deploy.md) | Exercise the real service boundary and record both tested commits. |
| [4. Revise cloud-agent work](docs/labs/04-cloud-agent.md) | Delegate one narrow operational change and request a human revision. |
| [5. Automate QA](docs/labs/05-gh-aw.md) | Use GA Agentic Workflows to explain a failed test and suggest regression coverage. |
| [Wrap up](docs/labs/workshop-wrap-and-evidence.md) | Build the final evidence chain and handoff. |

## Prompt-card pattern

Each lab uses the same five fields:

- **Use:** the Copilot App mode or GitHub surface.
- **Attach:** the minimum context required.
- **Prompt:** the bounded instruction.
- **Expect:** the observable result.
- **Decide:** the human review decision before continuing.

## Application and validation

In the **app repo**, the Express process serves the API and production client
bundle. The in-memory catalogue keeps the starter runnable before integration.

```powershell
npm ci
npx playwright install chromium firefox webkit
npm run check
```

Required endpoints are `/health`, `/ready`, `/api/products`, and
`/api/products/:id`.

In the **service repo**:

```powershell
npm ci
npm run check
npm run dev
```

The service listens on `http://localhost:3001`. Browse/detail works; search and
category inputs are deliberately rejected until your service child implements
them. Its `contracts/catalogue-v1.schema.json` and `contracts/examples/` own the
HTTP contract. Neither starter contains the completed cross-repo exercise.

### Instructor preparation

Use reviewed, full source SHAs supplied for this workshop, not floating branch
names. Before Lab 1, the helpers can check a fresh pair of copies:

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

Replace the owner, names, and SHA placeholders. Review the dry-run, then omit
`-DryRun` to seed the main outcome and separate Lab 4 follow-up issues. The
helpers compare starter tree contents: a new template copy does **not** inherit
the template's commit history. Run this baseline gate before learner edits.
App sign-in, Project access, and Fusion availability remain manual checks.
The Bash preflight accepts equivalent `--catalogue-repository` and
`--catalogue-expected-revision` arguments.

Azure deployment is optional advanced work and is not required to complete the
labs. Add `-IncludeAzure` (Bash: `--include-azure`) only for the existing advanced
Azure checks, with the assigned Azure scope and OIDC configuration. Details are in
[`infra/README.md`](infra/README.md).

## Product references

- [Copilot Fusion](https://docs.github.com/en/copilot/concepts/models/copilot-fusion)
  is GA. The [HydraFusion research article](https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/)
  explains its origins; use current product docs for setup.
- [GitHub Copilot Benchmarks](https://benchmarks.github.com/) compares task
  success and cost. Read the methodology; results are not promises for your task.
- [Copilot App Universe releases](https://github.blog/changelog/2026-10-28-github-copilot-app-universe-releases/)
  and [working with Projects](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-projects)
  describe the public-preview Project experience.
- [GitHub Agentic Workflows GA](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/)
  is the basis for Lab 5. Engine access, billing, and repository policy still apply.

Babazon.com is fictional and uses an original visual identity. Do not copy
Amazon branding, assets, page design, text, or trade dress.
