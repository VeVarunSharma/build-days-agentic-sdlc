---
applyTo: ".github/**"
---

Read root `AGENTS.md`, `DESIGN.md`, `.github/AGENTS.md`, the parent issue,
reviewed Copilot App Plan, and assigned child issue before editing.

- Default workflow permissions to read-only; grant writes only at the job that needs them.
- Use GitHub OIDC for Azure and protected environments for deployment.
- Never interpolate untrusted issue or pull-request content into shell commands.
- A check may pass only after performing the named validation. Report unavailable licensed/preview features explicitly.
- Keep participant commands Windows-safe (PowerShell); Ubuntu GitHub-hosted runners are acceptable.
- Pin official actions to stable major versions. Generate GH-AW lock workflows only with `gh aw compile`.
- Preserve issue-to-Plan-to-task-to-check-to-deployment traceability.
