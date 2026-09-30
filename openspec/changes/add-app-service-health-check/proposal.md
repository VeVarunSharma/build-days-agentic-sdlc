## Why

App Service only learns an instance is unhealthy from its platform probe. Pointing the probe at the application's existing `/health` endpoint lets the platform detect and replace failed instances.

## What Changes

- Configure the existing pinned AVM web-app composition to use `/health` as the App Service health-check path.

## Capabilities

### Modified Capabilities

- `azure-workshop-deployment`: adds a platform health-check requirement.

## Impact

- `infra/main.bicep` only (AVM module input). No new resources, secrets, or scope changes.