# Design

## Context

`infra/main.bicep` provisions the App Service via the pinned public module
`br/public:avm/res/web/site:0.24.0`. The module already receives a
`siteConfig` object configuring TLS, FTPS, HTTP/2, and the Linux runtime. The
application exposes `GET /health` in `src/server/app.ts`, which is excluded
from request logging and returns a readiness signal. Azure App Service has a
built-in health-check feature that periodically probes a configured path and
removes instances that repeatedly fail from the load-balancer rotation.

## Goals

- Make the existing `/health` endpoint actionable by the Azure platform.
- Keep the change within Azure Verified Module inputs (no unmanaged
  resources, no `Microsoft.Web/sites` overrides outside the module).

## Non-Goals

- No change to the `/health` endpoint implementation or its response shape.
- No change to identity, role assignments, networking, secrets, or any other
  provisioned resource.

## Decision

Add `healthCheckPath: '/health'` to the `siteConfig` inputs of the existing
`webApp` module. The AVM `site` module maps `siteConfig.healthCheckPath` to
the underlying `Microsoft.Web/sites` `healthCheckPath` property, so no
resource outside the module is required.

## Alternatives Considered

- **Post-deployment `az webapp config set`**: rejected — configuration would
  drift from the declarative Bicep source of truth and would not be captured
  by `what-if` or CI validation.
- **Native `Microsoft.Web/sites` resource override**: rejected — violates the
  repository guardrail to prefer pinned AVM inputs over unmanaged resources.

## Validation

- `az bicep build infra/main.bicep` (executed by `infra-validate.yml` in CI;
  local Bicep CLI is unavailable in the authoring environment).
- `what-if` against the target resource group remains instructor-gated
  (`AZURE_LIVE_VALIDATION_ENABLED`).
