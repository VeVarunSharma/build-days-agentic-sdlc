## Context

`infra/main.bicep` composes `avm/res/web/site:0.24.0`. The app already serves `/health` (liveness).

## Decisions

- Set `siteConfig.healthCheckPath: '/health'` in the existing AVM input. No raw `Microsoft.Web/sites` resource is added, so AVM pinning is preserved.
- `/health` is liveness only, so a storage outage does not cause instance recycling.

## Risks / Rollback

- Low risk; in-place configuration update. Rollback: remove the property and redeploy.