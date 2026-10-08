# Optional Azure infrastructure

This resource-group-scoped Bicep composition deploys a generic Linux App
Service and monitoring:

- App Service plan: `br/public:avm/res/web/serverfarm:0.7.0`
- Web app: `br/public:avm/res/web/site:0.24.0`
- Log Analytics: `br/public:avm/res/operational-insights/workspace:0.16.1`
- Application Insights: `br/public:avm/res/insights/component:0.8.0`

Babazon product data is deterministic and read-only, and cart state is
client-side. No persistence resource is required.

The web app always receives a system-assigned managed identity. Mission
planning remains disabled by default. To connect an existing Microsoft Foundry
project, set all six `foundry*` parameters:

- `foundryProjectEndpoint`
- `foundryAgentName`
- `foundrySubscriptionId`
- `foundryResourceGroupName`
- `foundryAccountName`
- `foundryProjectName`

Partial configuration fails the deployment assertion. Complete configuration
adds only the non-secret `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_AGENT_NAME`
app settings and assigns the managed identity the built-in **Foundry Agent
Consumer** role at the existing project scope. The project is referenced with
`Microsoft.CognitiveServices/accounts/projects@2025-06-01`; this composition
does not create or modify the Foundry account, project, model, or agent.

The OIDC deployment principal must be allowed to create role assignments at
the configured Foundry project scope. No publish profile, client secret, model
key, or other long-lived credential is used.

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

GitHub deployment uses OIDC and protected environments. Optional Foundry values
come from protected environment variables documented in the deployment
workflow. Outputs provide the app name, HTTPS URL, resource ID, deployment
identifier, Foundry configuration state, and monitoring resources.
