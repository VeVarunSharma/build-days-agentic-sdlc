# Lab 1: Frame the Babazon outcome

## Outcome

Create one parent issue for product search and category filtering, then review a
Copilot App Plan that resolves shared contracts before parallel work.

## Prerequisites

- The team repository is open in GitHub and the Copilot App.
- Issues and Actions are enabled.
- The application and tests run from the approved starter revision.

## Participant steps

Use the README prompt-card pattern for this and every later lab.

**Use:** Copilot App Plan mode.

**Attach:** `AGENTS.md`, `DESIGN.md`, and the parent issue created from the
feature issue form.

**Prompt:** Plan one Babazon product discovery outcome: shoppers can browse the
catalogue, search by product text, filter by category, clear filters, and see
accessible loading, empty, and failure states. Propose exactly four child
issues. Put shared contracts and deterministic catalogue foundations first.
Give every child explicit dependencies, owned paths, prohibited paths, focused
tests, and completion evidence. Do not implement.

**Expect:** A Plan that names the shared contract seam, sequences foundations
before UI and API integration, and leaves no overlapping ownership.

**Decide:** Approve only when a reviewer can assign every file to one child and
the acceptance criteria are observable.

Create the four child issues from the reviewed Plan:

1. shared product contracts and deterministic catalogue;
2. catalogue API, health, and readiness;
3. accessible search and category-filter UI;
4. integration, browser QA, and evidence.

## Expected repository artifacts

- One parent product-search outcome issue.
- A reviewed Copilot App Plan linked from the parent.
- Four linked child issues with dependencies and path boundaries.

## Verification

Ask the App to compare the parent issue, reviewed Plan, and children and report
any missing acceptance criterion, dependency, owned path, prohibited path, or
focused test. A human reviews the report before implementation starts.

## Recovery

If planning exceeds 25 minutes, keep the four-child sequence above, copy the
required boundary fields from the implementation-task issue form, and record
unresolved questions on the parent issue.

## Stretch

Add a short risk table covering contract drift, overlapping ownership,
non-deterministic data, inaccessible empty states, and slow validation.
