# Tasks

## 1. Author the issue-triage GH-AW

- [x] 1.1 Add `.github/workflows/issue-triage.md` triggered on `issues: [opened]`
  with `roles: all`, read-only permissions, `engine: copilot`, per-issue
  concurrency, and GitHub read toolsets.
- [x] 1.2 Declare narrow safe outputs: allowlisted `add-labels` (type/priority
  taxonomy), a single `add-comment`, and allowlisted `assign-to-user`.
- [x] 1.3 Write a task-focused prompt covering classification, duplicate
  detection, clarifying questions, best-fit routing, a single combined comment,
  and an explicit `noop` path, with no write action beyond the declared safe
  outputs.

## 2. Generate and validate

- [x] 2.1 Compile with `gh aw compile issue-triage` to produce
  `.github/workflows/issue-triage.lock.yml`.
- [x] 2.2 Confirm `.gitattributes` marks `*.lock.yml` as generated.
- [x] 2.3 Validate the OpenSpec change with `openspec validate
  add-issue-triage-workflow --strict`.

## 3. Deliver

- [ ] 3.1 Commit the workflow Markdown, generated lock, and OpenSpec artifacts,
  and open a pull request linking this change.
