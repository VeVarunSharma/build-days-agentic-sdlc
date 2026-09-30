# Proposal

## Why

New issues arrive without consistent classification, duplicate detection, or
ownership. Triage is manual, so issues sit unlabeled, duplicates accumulate,
underspecified reports stall without follow-up questions, and routing to the
right maintainer is ad hoc. The repository already standardizes on GitHub
Agentic Workflows (GH-AW) with read-only agent jobs and narrow safe outputs, so
first-touch triage can be automated within the existing governed pattern.

## What Changes

- Add a new GH-AW, `issue-triage`, that runs when an issue is opened and performs
  read-only analysis of the triggering issue only.
- Classify each new issue with exactly one `type: *` and one `priority: *` label
  drawn from a restricted allowlist.
- Detect near-duplicate open issues and label and reference the original without
  closing the new issue.
- Ask specific clarifying questions and apply `needs-info` when the report lacks
  the detail required to act.
- Route the issue to one best-fit maintainer from a restricted assignee
  allowlist, leaving it unassigned when no confident match exists.
- Keep the agent job read-only; perform every mutation through narrow
  `add-labels`, `add-comment`, and `assign-to-user` safe outputs.
- Commit both the GH-AW Markdown source and its generated `.lock.yml`.

## Capabilities

### New Capabilities

- `issue-triage-automation`: Automatic, read-only first-touch triage of newly
  opened issues through narrowly authorized safe outputs.

### Modified Capabilities

None.

## Non-Goals

- Closing, reopening, merging, or editing issue bodies.
- Granting the agent job direct write permissions or authority beyond the three
  declared safe outputs.
- Replacing human review of triage decisions or OpenSpec-governed feature work.
- Defining the full organization team-member routing table; the assignee
  allowlist ships with a safe default and a documented extension point.

## Impact

- **GitHub workflows:** Adds `.github/workflows/issue-triage.md` and its
  generated `.github/workflows/issue-triage.lock.yml`.
- **Permissions and security:** Agent job stays read-only (`contents: read`,
  `issues: read`); writes are constrained to restricted `add-labels`,
  `add-comment`, and `assign-to-user` safe outputs.
- **Operations:** Maintainers may extend the label and assignee allowlists in the
  workflow frontmatter and recompile with `gh aw compile`.
- **Application/infrastructure:** No application, test, or infrastructure
  behavior changes.
