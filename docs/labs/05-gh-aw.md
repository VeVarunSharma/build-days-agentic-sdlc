# Lab 5: Security and bounded automation

## Outcome

Remediate a deterministic CodeQL finding and inspect a GH-AW that writes exactly
one safe issue comment.

## Prerequisites

- The prepared team repository includes the isolated security exercise branch
  and draft pull request.
- CodeQL is available or its absence is recorded.
- GH-AW preview access is available for the automation stretch.

## Participant steps

**Use:** Copilot App Interactive mode.

**Attach:** The security issue, draft pull request, CodeQL alert, and exercise
fixture.

**Prompt:** Replace unsafe shell construction with the supplied allow-list and
argument-safe process execution. Do not suppress CodeQL or change production
application behavior. Run focused validation and preserve before/after alert
evidence.

**Expect:** The synthetic alert disappears and required checks remain green.

**Decide:** Merge only after human review confirms the finding was fixed rather
than hidden.

**Use:** GH-AW source and generated lock workflow.

**Attach:** `.github/workflows/issue-clarifier.md` and the pinned creation guide
at `https://raw.githubusercontent.com/github/gh-aw/v0.89.21/create.md`.

**Prompt:** Review the workflow for least privilege, untrusted input handling,
and exactly one safe output: an issue comment requesting missing acceptance
criteria, dependencies, owned paths, or prohibited paths. Use version `v0.89.21`,
installing or converging the extension to that version when necessary. Do not
use `main` or `latest`.

**Expect:** Reviewed Markdown source and its compiled lock workflow.

**Decide:** Do not enable the workflow if preview access, compilation, or safe
output review is unavailable. Reference `https://github.github.com/gh-aw/` and
the [public preview announcement](https://github.blog/changelog/2026-06-11-github-agentic-workflows-is-now-in-public-preview/).

## Expected repository artifacts

- Security issue and pull request with CodeQL evidence.
- Reviewed GH-AW Markdown source and generated lock file.

## Verification

Confirm the security check result, inspect workflow permissions, and verify the
workflow has exactly one safe output and cannot approve or merge its own work.

## Recovery

If CodeQL or GH-AW is unavailable, record `capability-unavailable`, complete the
local remediation test, and review the checked-in workflow statically.

## Stretch

Run the workflow on a disposable issue missing one boundary field and inspect
the resulting comment.
