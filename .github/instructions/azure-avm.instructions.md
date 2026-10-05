---
applyTo: "infra/**/*.bicep,infra/**/*.bicepparam"
---

Read root `AGENTS.md`, root `DESIGN.md`, `infra/AGENTS.md`, `infra/README.md`,
the parent issue, reviewed Plan, and assigned child issue before editing.

- Compose Azure resources with the pinned Azure Verified Module references
  documented in `infra/README.md`; do not float versions or replace an AVM
  with handwritten resources for convenience.
- If AVM cannot express a requirement, record the exact gap and rationale in
  the parent issue and reviewed Plan before adding narrowly scoped native
  Bicep.
- Keep deployments resource-group scoped and environment values in parameter
  files. Do not embed subscription IDs, tenant IDs, repository identities,
  credentials, or attendee-specific values.
- GitHub Actions authenticates to Azure with OIDC. Never add client secrets,
  publish profiles, storage keys, or other long-lived deployment credentials.
- Runtime Azure access uses managed identity and the smallest data-plane role
  at the smallest practical scope.
- Treat public ingress, role assignments, destructive changes, and permission
  expansion as explicit review decisions.
- Preserve outputs required for evidence, including application URL and
  deployment identifier.
- Validate with:

  ```powershell
  az bicep build --file .\infra\main.bicep
  az deployment group validate `
    --resource-group <team-resource-group> `
    --parameters .\infra\main.example.bicepparam
  az deployment group what-if `
    --name workshop-infra-preview `
    --resource-group <team-resource-group> `
    --parameters .\infra\main.example.bicepparam
  ```

Report `validate` or `what-if` as passed only when the authenticated command ran
against the assigned team resource group and its output was reviewed.
