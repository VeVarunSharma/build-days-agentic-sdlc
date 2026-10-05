## Change contract

- Parent issue:
- Child task issue:
- Reviewed Copilot App Plan: <!-- link or parent-issue plan receipt -->
- Change type: <!-- implementation / test / documentation / security / configuration -->
- Owned paths:
- Prohibited paths:
- Dependencies:

## Intent and acceptance criteria

Describe the parent outcome and observable criteria addressed by this bounded task.

## Validation evidence

| Evidence | Command or check | Result/link |
|---|---|---|
| Lint/typecheck | `npm run lint` / `npm run typecheck` | |
| Tests/build | `npm test` / `npm run build` | |
| Browser QA | catalogue/search/filter/page evidence | |
| Security | CodeQL / dependency review / other scanner | |
| Infrastructure | Bicep validation and Azure what-if | |
| Deployment | environment, URL, run/deployment ID, health and API smoke | |
| GH-AW | source/lock, run, and narrow safe output | |
| Security remediation | finding reference, fix commit, and passing rescan | |

## Risk and recovery

- Security/privacy impact:
- Deployment/configuration impact:
- Rollback or recovery checkpoint:
- Known feature/license/preview limitations:

## Review checklist

- [ ] The implementation stays within the parent outcome and child task scope.
- [ ] Dependencies were complete before implementation began.
- [ ] Owned and prohibited paths were respected.
- [ ] Changed acceptance criteria have deterministic tests or checks.
- [ ] No secret values or sensitive vulnerability details are present.
- [ ] Workflows use least privilege and Azure authentication uses OIDC.
- [ ] Generated files were produced by their owning tool.
- [ ] A human reviewer can reconstruct the issue-to-evidence story.
