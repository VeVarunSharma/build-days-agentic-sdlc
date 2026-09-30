# Proposal

## Why

The workshop web application already exposes a lightweight `GET /health`
endpoint (`src/server/app.ts`) that is intentionally excluded from request
logging. However, the App Service provisioned by `infra/main.bicep` does not
tell Azure where that health signal lives, so the platform cannot remove an
unhealthy instance from rotation or surface instance health during a
deployment. Wiring the App Service health check to `/health` makes the
existing readiness signal actionable by the platform, improving deployment
safety and observability without adding any new runtime behavior or
persisted state.

## What Changes

- Configure the App Service `healthCheckPath` to `/health` through the pinned
  `avm/res/web/site` module's `siteConfig` inputs in `infra/main.bicep`. This
  is a single managed input addition; no unmanaged resources, secrets,
  identity, role-assignment, or networking settings change.

## Capabilities

### New Capabilities

- `app-service-health-check`: the workshop App Service reports instance
  health to Azure by polling the application's existing `/health` endpoint,
  enabling the platform to detect and replace unhealthy instances.

### Modified Capabilities

(none — this adds a platform health-probe configuration without changing the
requirements of existing deployment or application behavior)

## Impact

- `infra/main.bicep`: add `healthCheckPath: '/health'` to the web app
  module's `siteConfig`.
- No application code changes; the `/health` endpoint already exists.
- CI (`infra-validate.yml`) runs `az bicep build` on the change; live
  validation / what-if remain instructor-gated.
