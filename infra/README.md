# Optional Azure infrastructure

This resource-group-scoped Bicep composition deploys generic Linux App Service
and monitoring only:

- App Service plan: `br/public:avm/res/web/serverfarm:0.7.0`
- Web app: `br/public:avm/res/web/site:0.24.0`
- Log Analytics: `br/public:avm/res/operational-insights/workspace:0.16.1`
- Application Insights: `br/public:avm/res/insights/component:0.8.0`

Babazon product data is deterministic and read-only, and cart state is
client-side. No persistence resource or data-plane role assignment is required.

Validate:

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

GitHub deployment uses OIDC and protected environments. Outputs provide the app
name, HTTPS URL, resource ID, deployment identifier, and monitoring resources.
