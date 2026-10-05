# Agent guide

This repository is an issue-first Agentic SDLC workshop and a deployable
Babazon.com starter. Follow links to authoritative context instead of
duplicating it.

## Read first

1. Read [`DESIGN.md`](DESIGN.md) for durable architecture and boundaries.
2. Read the workshop sequence in [`README.md`](README.md) and open only the
   assigned lab under `docs/labs/`.
3. Read the parent GitHub issue, its observable acceptance criteria, and the
   reviewed Copilot App Plan.
4. Read the bounded child issue and the closest co-located `AGENTS.md`.

## Source-of-truth order

1. The parent issue's approved outcome and acceptance criteria.
2. Root `DESIGN.md` and accepted architecture decisions.
3. The reviewed Copilot App Plan.
4. The assigned child issue's scope, dependencies, and path ownership.
5. Root and co-located `AGENTS.md` files.
6. Existing implementation patterns.

Stop and surface conflicts between higher-priority sources instead of silently
choosing.

## Required delivery workflow

- Start material work with one parent issue describing the user outcome and
  observable acceptance criteria.
- Review a Copilot App Plan before implementation.
- Split implementation into exactly four bounded child issues with explicit
  dependencies plus owned and prohibited paths.
- Stabilize shared contracts and foundations before using Fleet.
- Use isolated sessions or worktrees for parallel tasks and keep ownership
  non-overlapping.
- Link pull requests to their parent and child issues and record exact
  validation results.
- Treat deterministic CI, review, security, and deployment checks as durable
  evidence. Agent statements are not evidence by themselves.

GitHub issues, the reviewed Plan, pull requests, and CI are the complete
delivery record.

## Engineering guardrails

- Prefer existing patterns and dependencies over new abstractions.
- Do not weaken tests, security scanning, branch protections, or deployment
  gates.
- Use Azure Verified Modules for Azure resources unless a reviewed issue and
  Plan document a narrow exception.
- Use GitHub OIDC for Azure authentication; never add long-lived credentials.
- Give workflows least privilege and declare only required write permissions.
- Update tests for every changed acceptance criterion.
- Do not report completion without relevant validation evidence.

## Useful commands

```powershell
npm run check
git --no-pager diff --check
```

Use focused commands documented by the closest application or test guidance
before the full check.
