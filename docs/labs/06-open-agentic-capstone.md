# Optional capstone: Build an agentic application

## Outcome

Choose any useful domain, deploy one Microsoft Foundry prompt agent, and
integrate it into a tested user-facing TypeScript application.

This capstone is not issue-first. GitHub issues are optional, and a four-child
issue graph is not required. The durable receipts are the reviewed Copilot App
Plan, mode and Fleet evidence, repository changes, tests, deployed-agent
invocation, application demo, and cleanup owner.

## Prerequisites

- Complete the five core labs and workshop wrap-up.
- Azure CLI and azd are authenticated to the assigned subscription.
- Foundry permissions, approved region/model, and quota checks pass.
- Read [`../../capstone/README.md`](../../capstone/README.md) and
  [`../../capstone/AGENTS.md`](../../capstone/AGENTS.md).
- Choose either:
  - extend Babazon without breaking its existing behavior; or
  - create `capstone/<app-name>/` using TypeScript, React, and Express.

## Participant steps

**Use:** Copilot App Chat or Explore.

**Attach:** The capstone contract, relevant application code, and the existing
Foundry mission-planner pattern.

**Prompt:** Propose several agentic use cases for the domain I choose. Prefer a
problem with an ambiguous human goal, a bounded structured result,
authoritative application constraints, a user decision after the result, and
deterministic rules that can reject invalid output. Reject generic chatbots,
prose-only features, sensitive data, and destructive autonomous actions.

**Expect:** One selected use case with a clear user outcome, agent-fit
rationale, structured result, deterministic safeguards, and explicit
non-goals.

**Decide:** Continue only when the feature remains useful if the agent can fail,
time out, or return invalid output.

---

**Use:** Copilot App Plan mode.

**Attach:** The chosen use case, `AGENTS.md`, `DESIGN.md`, the applicable
source, and the Foundry project pattern under `foundry/`.

**Prompt:** Plan the thinnest complete vertical slice. Define the shared request
and response contract, untrusted model-output schema, deterministic validation,
server-side Foundry boundary, accessible UI states, tests, deployment inputs,
cleanup responsibility, and two to four non-overlapping Fleet tasks. Name
shared files with one integration owner. Do not implement.

**Expect:** A reviewed Plan with stable foundations before parallel work,
owned/prohibited paths, recovery behavior, and a real Foundry deployment path.

**Decide:** Save the Plan summary in the capstone README. Approve it only when
every model-controlled value is validated before display, action, or state
change.

---

**Use:** Copilot App Interactive mode.

**Attach:** The reviewed Plan and the files that own shared contracts,
configuration, and test fixtures.

**Prompt:** Implement only the shared contract, deterministic validation seam,
and Foundry interface. Add focused tests. Stop before feature UI or parallel
tasks.

**Expect:** A stable contract and green focused tests that independent tasks can
consume.

**Decide:** Record one meaningful steering decision and its resulting code or
test change. Start Fleet only after reviewing this foundation.

---

**Use:** Fleet with two to four isolated sessions.

**Attach:** The Plan and one bounded task per session.

**Prompt:** Implement only the assigned outcome and owned paths. Treat
prohibited paths as hard boundaries. Reuse the approved contract, add focused
tests, and return exact validation results. Pause on contract ambiguity.

**Expect:** Independent work such as server integration, accessible UI,
Foundry instructions/evaluations, and browser tests with no overlapping edits.

**Decide:** Reject work that changes shared foundations without the integration
owner. Preserve the Fleet task names, dependencies, and ownership in the
capstone README.

---

**Use:** Copilot App Interactive mode for integration and Foundry deployment.

**Attach:** All Fleet changes, the reviewed Plan, Foundry instructions and
scenarios, and the current test results.

**Prompt:** Integrate the vertical slice. Provision or reuse the approved
Foundry project and model, deploy one prompt agent, and invoke it with a fixed
scenario. Configure the application without committing endpoints or
credentials. Invoke the agent only through the server using Entra
authentication. Validate its structured result before the user-facing flow can
display an action or mutate state.

**Expect:** A real deployed-agent invocation and an accessible application flow
with loading, validation, unavailable, invalid-output, success, and recovery
states.

**Decide:** Complete the capstone only after a user can exercise the feature and
the app proves the output was validated. A portal playground, raw model call,
fixture, or mock is not deployed-agent evidence.

## Expected repository artifacts

- Either reviewed Babazon changes or a named `capstone/<app-name>/` subtree.
- A capstone README containing:
  - user problem and agent-fit rationale;
  - reviewed Plan summary and non-goals;
  - Interactive steering receipt;
  - Fleet tasks, dependencies, owned paths, and integration result;
  - Foundry project, model deployment, and agent names without credentials;
  - request, model-output, and canonical application contracts;
  - exact test results and demo evidence;
  - limitations and Azure cleanup owner.
- A deployed Foundry prompt agent and at least one real invocation receipt.
- Unit, API, UI, and Playwright evidence for the user-facing flow.

## Verification

Ask the App to verify:

1. the deployed agent is invoked through the server with Entra authentication;
2. no browser bundle, committed file, issue, or log contains credentials;
3. unknown, malformed, unsafe, or out-of-policy agent output is rejected;
4. the application remains usable when Foundry is unavailable;
5. the tested browser journey reaches a real user-visible result;
6. the README receipts match the final diff and test output;
7. cleanup ownership and commands are recorded but not run without human
   approval.

## Recovery

- If the use case is too broad, reduce it to one user action and one structured
  agent result.
- If Fleet paths overlap, pause parallel work and restore one integration owner
  for shared files.
- If subscription, permission, region, model, or quota readiness fails, record
  `capability-unavailable`. Use an organizer-approved project only when team
  provisioning is explicitly unavailable.
- Continue deterministic local development when cloud access is blocked, but
  do not claim completion until a real deployed-agent invocation succeeds.
- Never present mocks, fixtures, portal-only output, or local model calls as
  Foundry deployment evidence.

## Stretch

Add a small evaluation set that includes one success, one constraint violation,
and one unsupported request. Compare two instruction versions and keep the
version that improves evaluated behavior without weakening deterministic
application validation.
