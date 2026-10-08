import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const infrastructure = readFileSync("infra/main.bicep", "utf8");
const foundryRoleAssignment = readFileSync(
  "infra/modules/foundry-role-assignment.bicep",
  "utf8",
);

describe("optional deployment evidence contract", () => {
  it("keeps Foundry optional while enabling managed identity", () => {
    expect(infrastructure).toContain("br/public:avm/res/web/site:");
    expect(infrastructure).toContain("br/public:avm/res/insights/component:");
    expect(infrastructure).toContain("br/public:avm/res/operational-insights/workspace:");
    expect(infrastructure).not.toMatch(/storageAccounts|tableServices|AZURE_STORAGE/i);
    expect(infrastructure).toContain("systemAssigned: true");
    expect(infrastructure).toContain("foundryConfigurationAbsent");
    expect(infrastructure).toContain(
      "fail('Foundry parameters must be either all configured or all empty.')",
    );
  });

  it("references the current Foundry project schema and grants only agent consumption", () => {
    expect(foundryRoleAssignment).toContain(
      "Microsoft.CognitiveServices/accounts/projects@2025-06-01",
    );
    expect(infrastructure).toContain(
      "eed3b665-ab3a-47b6-8f48-c9382fb1dad6",
    );
    expect(foundryRoleAssignment).toContain("scope: foundryProject");
    expect(infrastructure).toContain("principalId: webApp.outputs.systemAssignedMIPrincipalId!");
    expect(foundryRoleAssignment.match(/Microsoft\.Authorization\/roleAssignments/g)).toHaveLength(1);
  });

  it("uses only non-secret conditional Foundry app settings", () => {
    expect(infrastructure).toContain("FOUNDRY_PROJECT_ENDPOINT: foundryProjectEndpoint");
    expect(infrastructure).toContain("FOUNDRY_AGENT_NAME: foundryAgentName");
    expect(infrastructure).not.toMatch(/FOUNDRY.*(?:KEY|SECRET|TOKEN)|listKeys/i);
  });

  it("requires same-repository PR head and passing checks", () => {
    expect(workflow).toContain("head.repo.full_name // empty");
    expect(workflow).toContain(
      "Selected commit $DEPLOYED_SHA is not the current head $head_sha of pull request #$PR_NUMBER.",
    );
    expect(workflow).toContain('gh pr checks "$PR_NUMBER" --required');
  });

  it("uses OIDC with least privilege", () => {
    expect(workflow.match(/id-token: write/g)).toHaveLength(1);
    expect(workflow.match(/pull-requests: write/g)).toHaveLength(1);
    expect(workflow).toContain("azure/login@v2");
    expect(workflow).not.toMatch(/client-secret|publish-profile/i);
  });

  it("publishes evidence only after all live Babazon checks", () => {
    const verify = workflow.indexOf("Verify deployed health, readiness, catalogue, search, filter, and page");
    const create = workflow.indexOf("Create machine-readable deployment evidence");
    const upload = workflow.indexOf("Upload deployment evidence");
    expect(verify).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(verify);
    expect(upload).toBeGreaterThan(create);
    for (const field of ["health", "readiness", "catalogue", "search", "category_filter", "page"]) {
      expect(workflow).toContain(field);
    }
    expect(workflow).toContain("([.verification[]] | all)");
  });

  it("records configured and unconfigured Foundry state without its endpoint", () => {
    for (const variable of [
      "FOUNDRY_PROJECT_ENDPOINT",
      "FOUNDRY_AGENT_NAME",
      "FOUNDRY_SUBSCRIPTION_ID",
      "FOUNDRY_RESOURCE_GROUP_NAME",
      "FOUNDRY_ACCOUNT_NAME",
      "FOUNDRY_PROJECT_NAME",
    ]) {
      expect(workflow).toContain(`vars.${variable}`);
    }
    expect(workflow).toContain("Foundry deployment variables must be either all configured or all unset.");
    expect(workflow).toContain('"$APPLICATION_URL/api/shopping-missions"');
    for (const field of [
      "configured",
      "system_assigned_identity",
      "agent_consumer_role_assigned",
      "mission_planner_smoke",
      "endpoint_included",
    ]) {
      expect(workflow).toContain(field);
    }
    expect(workflow).toContain("endpoint_included:false");
    expect(workflow).not.toMatch(/foundry:\{[^}]*project_endpoint/);
  });

  it("keeps PR evidence writing in the post-success job", () => {
    expect(workflow).toMatch(/publish-evidence:\s*\n\s+needs: \[validate-linkage, deploy\]/);
    expect(workflow).toContain("<!-- workshop-deployment-evidence -->");
    expect(workflow).toContain("gh api --method PATCH");
    expect(workflow).toContain("gh api --method POST");
  });
});
