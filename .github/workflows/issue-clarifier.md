---
on:
  workflow_dispatch:
    inputs:
      issue:
        description: Issue number to review
        required: true
        type: number

permissions:
  contents: read
  issues: read

engine: copilot

concurrency:
  group: issue-clarifier
  cancel-in-progress: false
  job-discriminator: ${{ github.run_id }}

tools:
  github:
    toolsets: [context, repos, issues]

network: defaults

safe-outputs:
  add-comment:
    max: 1

---

# Issue clarifier

Review issue `${{ inputs.issue }}` as a read-only workshop issue analyst.

1. Summarize the user or operator outcome requested by the issue.
2. Identify missing acceptance criteria, constraints, or validation evidence.
3. Check for dependencies plus owned and prohibited paths.
4. If the issue is already clear, state that it is ready for Copilot App planning.
5. Use the single allowed issue comment for the concise result.

Do not edit files, assign the issue, approve changes, merge, or deploy.
