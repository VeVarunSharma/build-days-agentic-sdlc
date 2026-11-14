# Lab 3: Build, test, deploy

## Outcome

Integrate price sorting, prove the shopper journey, and optionally deploy it.

## Prerequisites

Contract, API, and UI changes are reviewable and pass focused checks.

## Participant steps

**Use:** The integration Session, terminal, and browser preview.

**Attach:** The parent, reviewed Plan, child changes, and CI results.

**Prompt:** Integrate the reviewed sorting work. Verify both price directions,
the agreed default and equal-price order, search/category combinations, reset,
empty results, and errors. Preserve cart and checkout. Fix integration defects
only. Run focused checks, then the full check. Isolate browser projects' server
state so they do not share a rate-limit budget; keep production limits unchanged.

**Expect:** A working feature and evidence tied to the tested commit.

**Decide:** Inspect the diff and results before merge.

In the Session's terminal:

```powershell
npm run check
$env:NODE_ENV = "production"
$env:PORT = "3000"
npm start
```

Open `http://127.0.0.1:3000` in the browser or ask Copilot to open a browser
preview. Exercise sorting with filters. Stop only the server process you started.

### Optional deployment

If your instructor prepared Azure, follow [infra/README.md](../../infra/README.md).
Use the protected deployment workflow and required approval. Verify the app page,
`/health`, `/ready`, `/api/products`, and the agreed sorting queries.
Keep OIDC and existing checks; do not add credentials or skip approvals.

## Expected repository artifacts

Reviewed changes, local/browser/CI results, and optional deployment evidence.

## Verification

Confirm `npm run check` and required GitHub checks pass on the final head.
Record exact commands, results, commit, and run links. A local preview is not
proof of an Azure deployment.

## Recovery

Return to the last reviewed commit and reapply only reviewed changes.
Without Azure access, finish local/browser verification and record deployment
as unavailable.

## Stretch

Add a regression test for an equal-price or filter/sort interaction.

[Previous: Multi-agent orchestration](02-multi-agent-orchestration.md) | [README](../../README.md) | [Next: Cloud agent](04-cloud-agent.md)
