# Tasks

## 1. Configure App Service health check

- [x] 1.1 Add `healthCheckPath: '/health'` to the `webApp` module's
  `siteConfig` in `infra/main.bicep`, preserving all existing inputs.
- [x] 1.2 Confirm the application already serves `GET /health`
  (`src/server/app.ts`) so the probe target is valid.

## 2. Validate

- [x] 2.1 Run `git --no-pager diff --check` for whitespace errors.
- [ ] 2.2 `az bicep build infra/main.bicep` — deferred to CI
  (`infra-validate.yml`); local Bicep CLI unavailable in the authoring
  environment.
- [ ] 2.3 `what-if` against the target resource group — instructor-gated
  (`AZURE_LIVE_VALIDATION_ENABLED`).
