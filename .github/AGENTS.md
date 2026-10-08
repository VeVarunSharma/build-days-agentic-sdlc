# GitHub automation agent guide

This directory owns CI, deployment, security scanning, Copilot customization, issue forms, and GH-AW.

- Workflows default to read-only permissions and add only required scopes.
- Pin third-party actions to an approved version or commit according to repository policy.
- Azure authentication uses OIDC and protected environments.
- Pull requests must expose actionable test, security, and deployment evidence.
- Agentic workflows declare narrow safe outputs and must not self-approve or bypass protected changes.
- Commit both GH-AW Markdown source and its generated lock workflow.
- Keep participant-triggered workflows bounded with manual, label, or path filters where practical.
- Never expose secrets, tokens, or untrusted issue/PR content to unsafe shell interpolation.
- Preserve parent issue -> reviewed Plan -> child issue -> PR -> evidence
  traceability.
