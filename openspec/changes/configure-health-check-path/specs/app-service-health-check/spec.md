# Spec Delta

## Purpose

Ensures the workshop App Service reports instance health to the Azure platform
by probing the application's existing `/health` endpoint, so unhealthy
instances can be detected and replaced during and after deployment.

## ADDED Requirements

### Requirement: App Service probes the application health endpoint
The App Service provisioned for the workshop SHALL be configured with a health
check path that targets the application's existing `/health` endpoint, so the
Azure platform can evaluate instance health and remove unhealthy instances
from rotation.

#### Scenario: Health check path is configured to the application endpoint
- **WHEN** the workshop infrastructure is provisioned from `infra/main.bicep`
- **THEN** the App Service `healthCheckPath` is set to `/health`, matching the
  endpoint served by the application

#### Scenario: Health check configuration uses the pinned AVM module
- **WHEN** the health check path is configured
- **THEN** it is provided through the pinned `avm/res/web/site` module's
  `siteConfig` inputs, without introducing an unmanaged `Microsoft.Web/sites`
  resource or altering identity, role assignments, networking, or secrets
