## ADDED Requirements

### Requirement: Automatic new-issue triage

The repository SHALL provide a GitHub Agentic Workflow that triages each newly
opened issue by classifying it, detecting duplicates, requesting missing
information, and routing it to an owner, acting only on the triggering issue.

#### Scenario: Actionable new issue

- **WHEN** an issue is opened with enough detail to classify
- **THEN** the workflow applies exactly one allowed `type: *` label and one
  allowed `priority: *` label to that issue through the `add-labels` safe output

#### Scenario: Well-formed issue needs no comment

- **WHEN** an opened issue is already well-classified and has no duplicate or
  missing information
- **THEN** the workflow completes without posting an empty or placeholder
  comment, using `noop` when no evidence-backed change applies

### Requirement: Duplicate detection without closing

The workflow SHALL identify near-duplicate open issues and mark and reference the
original, and SHALL NOT close, reopen, or merge any issue.

#### Scenario: Duplicate of an existing open issue

- **WHEN** a newly opened issue clearly matches an existing open issue
- **THEN** the workflow adds the `duplicate` label and references the original
  issue in its single comment while leaving the new issue open

### Requirement: Clarifying questions for unclear issues

The workflow SHALL request the specific information needed to act when a new
issue is underspecified.

#### Scenario: Issue lacks actionable detail

- **WHEN** an opened issue is missing reproduction steps, expected versus actual
  behavior, environment, or acceptance criteria required to act
- **THEN** the workflow adds the `needs-info` label and asks specific clarifying
  questions in its single comment

### Requirement: Bounded assignment routing

The workflow SHALL assign at most one maintainer from a restricted allowlist and
SHALL leave the issue unassigned when no confident owner match exists.

#### Scenario: Confident owner match

- **WHEN** the issue area maps to a maintainer in the assignee allowlist
- **THEN** the workflow assigns that single maintainer through the
  `assign-to-user` safe output

#### Scenario: No confident owner match

- **WHEN** no allowlisted maintainer clearly owns the issue area
- **THEN** the workflow leaves the issue unassigned and notes the routing
  uncertainty rather than assigning an arbitrary or non-allowlisted user

### Requirement: Read-only authority with narrow safe outputs

The workflow's agent job SHALL run with read-only permissions and SHALL perform
every mutation through its declared `add-labels`, `add-comment`, and
`assign-to-user` safe outputs, and SHALL NOT edit files or workflows, approve,
merge, or deploy.

#### Scenario: Workflow processes a new issue

- **WHEN** the triage workflow runs
- **THEN** platform permissions prevent any change beyond the three declared safe
  outputs on the triggering issue

### Requirement: Reproducible generation

The workflow Markdown SHALL remain reproducible with its generated lock workflow.

#### Scenario: Workflow source changes

- **WHEN** the issue-triage GH-AW Markdown is modified
- **THEN** `gh aw compile` regenerates a matching `issue-triage.lock.yml` and
  validation detects a missing or stale generated lock
