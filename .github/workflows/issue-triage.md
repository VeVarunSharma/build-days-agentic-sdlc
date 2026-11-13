---
on:
  issues:
    types: [opened]
  roles: all

permissions:
  contents: read
  issues: read

engine: copilot

concurrency:
  group: issue-triage-${{ github.event.issue.number }}
  cancel-in-progress: false

tools:
  github:
    toolsets: [context, repos, issues]

network: defaults

safe-outputs:
  add-labels:
    allowed:
      - "type: bug"
      - "type: feature"
      - "type: docs"
      - "type: question"
      - "type: chore"
      - "priority: critical"
      - "priority: high"
      - "priority: medium"
      - "priority: low"
      - "needs-info"
      - "duplicate"
    max: 4
  add-comment:
    max: 1
  assign-to-user:
    allowed:
      - VeVarunSharma
    max: 1

---

# Issue triage

Triage newly opened issue `#${{ github.event.issue.number }}` as a read-only
workshop triage analyst. Act only on the triggering issue and use only the
declared safe outputs.

## Read the issue

- Read the issue title, body, author, and any existing labels through the
  read-only GitHub tools.
- Search existing open issues for near-duplicates of this report before
  classifying.

## Classify (labels)

Apply labels only from the allowed set through the `add-labels` safe output.

- Exactly one `type: *` label describing the nature of the request
  (`bug`, `feature`, `docs`, `question`, or `chore`).
- Exactly one `priority: *` label reflecting user impact and urgency
  (`critical`, `high`, `medium`, or `low`). Prefer `medium` when impact is
  genuinely unclear rather than guessing high or low.

## Detect duplicates

- If a clearly matching open issue exists, add the `duplicate` label and, in the
  single allowed comment, link the original issue (`#<number>`) and briefly
  explain the overlap. Do not close the issue.

## Ask clarifying questions when unclear

- If the report lacks the information needed to reproduce, scope, or act on it
  (for example missing steps, expected versus actual behavior, environment, or
  acceptance criteria), add the `needs-info` label and use the single allowed
  comment to ask specific, numbered clarifying questions.

## Route to a team member

- When the correct owner is evident from the issue area, assign one best-fit
  maintainer from the allowed assignee list through the `assign-to-user` safe
  output. Maintainers extend that allowlist and area mapping in the workflow
  frontmatter; do not assign anyone outside it.
- If no confident owner match exists, leave the issue unassigned and note the
  routing uncertainty in the comment.

## Comment

- Use at most one issue comment that combines the triage summary, any duplicate
  reference, and any clarifying questions. Provide a meaningful body; do not post
  placeholder-only text.

## No-op

- If the issue is already well-classified, non-actionable for triage, or you
  have no evidence-backed change to make, call `noop` with a short reason and do
  not post an empty comment.

Do not edit files or workflows, close, reopen, or merge, approve changes,
deploy, or take any action beyond the declared safe outputs.
