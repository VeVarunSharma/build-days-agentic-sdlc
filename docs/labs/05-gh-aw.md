# Lab 5: Deterministic security remediation

## Outcome

Remediate a deterministic CodeQL finding without suppressing or bypassing the
security control.

## Prerequisites

- The prepared team repository includes the isolated security exercise branch
  and draft pull request.
- CodeQL is available or its absence is recorded.

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

## Expected repository artifacts

- Security issue and pull request with CodeQL evidence.
- Focused remediation test results and before/after alert evidence.

## Verification

Confirm the focused test and CodeQL result on the final commit. Inspect the diff
to prove the unsafe construction was replaced rather than ignored, excluded, or
suppressed.

## Recovery

If CodeQL is unavailable, record `capability-unavailable`, complete the local
remediation test, and leave the pull request open until the required security
evidence can be produced.

## Stretch

Create or update the checked-in GH-AW from the pinned `v0.89.21` creation guide
at `https://raw.githubusercontent.com/github/gh-aw/v0.89.21/create.md`; do not
use `main` or `latest`. Review its Markdown source and generated lock workflow
for least privilege, untrusted input handling, and exactly one safe output: an
issue comment requesting missing acceptance criteria, dependencies, owned
paths, or prohibited paths. Do not enable it when preview access, compilation,
or safe-output review is unavailable. Then run it on a disposable issue missing
one boundary field and inspect the resulting comment. Reference
`https://github.github.com/gh-aw/` and the
[public preview announcement](https://github.blog/changelog/2026-06-11-github-agentic-workflows-is-now-in-public-preview/).
