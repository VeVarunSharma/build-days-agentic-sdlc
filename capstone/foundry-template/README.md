# Generic Foundry prompt-agent template

Use this template when a capstone needs a prompt agent that differs from the
Babazon mission planner.

1. Copy `instructions.template.md` and `scenarios.example.json` into the named
   capstone subtree.
2. Replace every `{{PLACEHOLDER}}` with domain-specific content.
3. Define a strict JSON output and a matching Zod schema in the application.
4. Render authoritative application data into the instructions
   deterministically when grounding is required.
5. Provision or reuse the checked-in public Basic Setup under `foundry/`.
6. Use a unique project, model deployment, and agent name.
7. Deploy the prompt agent through a server-side Entra-authenticated script.
8. Keep generated instructions, azd environment state, endpoints, and results
   out of source control.

The application must recalculate authoritative values and reject unknown,
malformed, unsafe, or out-of-policy model output. Do not add tools unless the
reviewed Plan proves they are necessary.
