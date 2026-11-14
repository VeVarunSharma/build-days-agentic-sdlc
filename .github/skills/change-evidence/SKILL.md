---
name: change-evidence
description: Build a traceable evidence matrix for an issue-first pull request or deployment.
---

# Change evidence

Use this skill when preparing or reviewing delivery evidence.

1. Read the parent issue, reviewed Copilot App Plan, and bounded child issue.
2. Enumerate every affected acceptance criterion.
3. Map each criterion to its task, changed paths, tested commit, and an independent check.
4. Record the exact command/check, status, run link, and relevant artifact or deployment identifier.
5. Classify evidence as `pass`, `fail`, `missing`, or `unavailable`. Never convert skipped or unavailable checks into success.
6. For Azure delivery, include commit SHA, protected environment, resource group, application URL, workflow run/deployment ID, health, readiness, and API smoke results.
7. For QA automation, include the source CI run, triage run/issue, replay deduplication, and success-run no-op evidence. Separate observations from agent hypotheses.
8. Record blockers such as missing OIDC variables, environment approval, GHAS/license access, Azure permissions/quota, GH-AW engine billing/policy, or App Session/Fusion availability. A static review is not live-run evidence.

Use this compact output:

| Acceptance criterion | Evidence | Status | Link/identifier | Gap or next action |
|---|---|---|---|---|

End with an overall `complete` or `incomplete` verdict. A complete verdict requires independent evidence for every applicable criterion.
