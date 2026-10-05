import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const infrastructure = readFileSync("infra/main.bicep", "utf8");

describe("optional deployment evidence contract", () => {
  it("deploys only a generic web app and monitoring baseline", () => {
    expect(infrastructure).toContain("br/public:avm/res/web/site:");
    expect(infrastructure).toContain("br/public:avm/res/insights/component:");
    expect(infrastructure).toContain("br/public:avm/res/operational-insights/workspace:");
    expect(infrastructure).not.toMatch(/storageAccounts|tableServices|AZURE_STORAGE|roleAssignments/i);
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

  it("keeps PR evidence writing in the post-success job", () => {
    expect(workflow).toMatch(/publish-evidence:\s*\n\s+needs: \[validate-linkage, deploy\]/);
    expect(workflow).toContain("<!-- workshop-deployment-evidence -->");
    expect(workflow).toContain("gh api --method PATCH");
    expect(workflow).toContain("gh api --method POST");
  });
});
