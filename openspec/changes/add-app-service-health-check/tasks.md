## 1. Infrastructure (owner: `infra/main.bicep`)

- [x] 1.1 Add `healthCheckPath: '/health'` to the web-app `siteConfig`
- [ ] 1.2 Run `az bicep build --file .\infra\main.bicep` and record the result
- [x] 1.3 Run `openspec validate --all` and `git diff --check`
- [ ] 1.4 Run Azure `what-if` (requires instructor-provided resource group and OIDC); record as unrun if unavailable