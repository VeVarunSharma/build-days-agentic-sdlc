# Infrastructure agent guide

This directory composes Azure infrastructure for the workshop application.

- Use pinned Azure Verified Modules unless a reviewed issue and Plan record an exception.
- Keep environment-specific values in parameter files, not module logic.
- Use managed identities and GitHub OIDC; never introduce long-lived Azure credentials.
- Scope workshop deployments to the assigned team resource group.
- Run Bicep build/lint and Azure `what-if` before deployment.
- Treat destructive changes, role assignments, public ingress, and secret handling as explicit design decisions.
- Expose deployment outputs needed for pull-request evidence, including the application URL and deployment identifier.

## Current composition

- The entry point is `main.bicep`; deployments are scoped to the assigned resource group.
- Keep AVM references pinned to the versions documented in `README.md`.
- Keep this optional infrastructure generic. Babazon product data is
  deterministic and the cart is client-side, so no commerce persistence
  resource belongs in the baseline.

## Validation

```powershell
az bicep build --file .\infra\main.bicep
az deployment group validate --resource-group <team-resource-group> --parameters .\infra\main.example.bicepparam
az deployment group what-if --resource-group <team-resource-group> --parameters .\infra\main.example.bicepparam
```
