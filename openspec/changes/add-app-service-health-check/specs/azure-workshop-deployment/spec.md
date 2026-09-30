## ADDED Requirements

### Requirement: App Service health check

The deployed web app SHALL configure the App Service health-check path as `/health` through the pinned AVM web-app module inputs, without unmanaged replacement resources.

#### Scenario: Health path is configured

- **WHEN** the Bicep composition is built
- **THEN** the web-app `siteConfig` sets `healthCheckPath` to `/health`

#### Scenario: Guardrails preserved

- **WHEN** the health-check change is applied
- **THEN** managed identity, resource-group scope, Entra-only storage access, and OIDC-only authentication are unchanged