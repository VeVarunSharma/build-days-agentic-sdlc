# Design

## Context

The repository standardizes participant and instructor automation on GitHub
Agentic Workflows (GH-AW), with read-only agent jobs and narrow safe outputs
(see `issue-clarifier.md` and `failed-test-explainer.md`). `.github/AGENTS.md`
and `.github/instructions/github-platform.instructions.md` require read-only
default permissions, narrow safe outputs, no self-approval or protected-change
bypass, no untrusted-content shell interpolation, and committing both GH-AW
Markdown source and its generated lock workflow. The `spec-pr-policy.yml` gate
requires governed `.github/workflows/**` changes to link an approved OpenSpec
change.

## Goals / Non-Goals

**Goals:**

- Give every newly opened issue consistent first-touch triage: type and priority
  labels, duplicate detection, clarifying questions, and best-fit routing.
- Keep the agent job read-only and constrain all writes to narrow safe outputs.
- Remain reproducible: Markdown source plus a `gh aw compile`-generated lock.

**Non-Goals:**

- Closing/merging/editing issues or granting broad write scopes.
- Encoding the complete team routing table in this change.

## Decisions

- **Trigger:** `on.issues.types: [opened]` — the smallest trigger matching
  "new issues," scoped to the single triggering issue via a per-issue
  `concurrency` group.
- **`roles: all`:** Triage must apply to every new issue regardless of author
  role, so the public issue entrypoint is enabled deliberately. The agent job
  remains read-only and bounded by safe-output allowlists, so a wider trigger
  audience cannot escalate authority.
- **Read-only permissions + safe outputs:** `contents: read`, `issues: read`;
  mutations only through `add-labels` (allowlisted taxonomy, `max: 4`),
  `add-comment` (`max: 1`), and `assign-to-user` (allowlisted, `max: 1`). This
  satisfies the "narrow safe outputs, no self-approval" guardrail.
- **Assignment routing:** `assign-to-user.allowed` ships with a single safe
  default (`VeVarunSharma`) and the prompt instructs maintainers to extend the
  allowlist and area mapping. This fulfills real assignment without hardcoding an
  unknown team roster, and prevents assigning users outside the allowlist.
- **Duplicates without closing:** The agent labels `duplicate` and references the
  original issue in the single comment; it never closes, honoring the no-op and
  no-close constraints.
- **Single comment:** Triage summary, duplicate reference, and clarifying
  questions are combined into one `add-comment` to avoid noise; `noop` is used
  when no evidence-backed change applies.
- **Engine:** `engine: copilot`, matching the existing repository workflows.

## Risks / Trade-offs

- **Assignee allowlist default is narrow.** Until maintainers extend it, routing
  concentrates on one owner. Mitigation: documented extension point and the
  agent leaves issues unassigned when no confident match exists.
- **Mislabeling.** Model classification can err. Mitigation: restricted label
  allowlist, `priority: medium` default under uncertainty, and human review of
  applied labels.

## Migration Plan

Additive only. Add the Markdown and generated lock; no existing workflow,
application, test, or infrastructure behavior changes. Rollback is deletion of
the two workflow files.

## Open Questions

- The final maintainer-to-area routing table is deferred to maintainers via the
  frontmatter allowlist and prompt mapping.
