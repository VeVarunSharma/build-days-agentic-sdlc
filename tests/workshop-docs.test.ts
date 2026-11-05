import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const participantLabs = [
  "docs/labs/01-outcome-and-plan.md",
  "docs/labs/02-multi-agent-orchestration.md",
  "docs/labs/03-build-test-deploy.md",
  "docs/labs/04-cloud-agent.md",
  "docs/labs/05-gh-aw.md",
  "docs/labs/workshop-wrap-and-evidence.md",
];
const ownedTextFiles = [
  "README.md",
  "AGENTS.md",
  "DESIGN.md",
  ...participantLabs,
  ".github/copilot-instructions.md",
  ".github/skills/change-evidence/SKILL.md",
];

const read = (path: string) => {
  if (!path.endsWith(".md")) {
    throw new Error("Documentation checks must not inspect learner implementation files.");
  }
  return readFileSync(resolve(root, path), "utf8");
};

function listMarkdownFiles(directory: string, prefix = ""): string[] {
  return readdirSync(resolve(root, directory, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return listMarkdownFiles(directory, relative);
      return entry.name.endsWith(".md") ? [`${directory}/${relative}`] : [];
    })
    .sort();
}

describe("issue-first workshop documentation", () => {
  it("keeps only the five participant labs and wrap-up under docs", () => {
    expect(listMarkdownFiles("docs")).toEqual([...participantLabs].sort());
  });

  it.each(participantLabs)("%s is App-first and independently runnable", (path) => {
    const content = read(path);
    for (const section of [
      "## Outcome",
      "## Prerequisites",
      "## Expected repository artifacts",
      "## Verification",
      "## Recovery",
      "## Stretch",
    ]) {
      expect(content, `${path} is missing ${section}`).toContain(section);
    }
    for (const field of ["**Use:**", "**Attach:**", "**Prompt:**", "**Expect:**", "**Decide:**"]) {
      expect(content, `${path} is missing ${field}`).toContain(field);
    }
  });

  it("uses one parent outcome, a reviewed Plan, and four bounded children", () => {
    const content = `${read("README.md")}\n${read("docs/labs/01-outcome-and-plan.md")}`;
    expect(content).toMatch(/product search and\s+category/);
    expect(content).toContain("reviewed Copilot App Plan");
    expect(content).toMatch(/exactly four|four bounded child/i);
    expect(content).toMatch(/owned\s+paths/);
    expect(content).toMatch(/prohibited\s+paths/);
    expect(content).toContain("dependencies");
  });

  it("uses Project coordination by default and keeps Fleet in the stretch", () => {
    const content = read("docs/labs/02-multi-agent-orchestration.md");
    const [main, stretch] = content.split("## Stretch");
    expect(main).toBeDefined();
    expect(stretch).toBeDefined();
    for (const concept of ["Interactive mode", "Project", "isolated session", "Autopilot", "Needs input"]) {
      expect(main).toContain(concept);
    }
    expect(main).not.toContain("Fleet");
    expect(stretch).toContain("Fleet");
  });

  it("starts with Fusion and a Project containing the app and service copies", () => {
    const readme = read("README.md");
    const lab = read("docs/labs/01-outcome-and-plan.md");
    expect(readme.indexOf("Copilot Fusion")).toBeGreaterThan(-1);
    expect(readme.indexOf("Copilot Fusion")).toBeLessThan(readme.indexOf("## Labs"));
    for (const link of [
      "https://benchmarks.github.com/",
      "https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/",
      "https://docs.github.com/en/copilot/concepts/models/copilot-fusion",
      "https://github.com/VeVarunSharma/babazon-catalogue-service",
    ]) {
      expect(readme).toContain(link);
    }
    expect(readme).toContain("Fusion High");
    expect(lab).toContain("../../README.md#references");
    expect(lab).toContain("Do not implement");
    expect(readme).toContain("Projects is public preview");
    expect(readme).toContain("both participant repos");
    expect(lab).toContain("owner/repo#number");
    expect(lab).toContain("contracts/catalogue-v1.schema.json");
    expect(readme).toMatch(/Use this\s+template/);
  });

  it("describes real-boundary proof without checking the learner's implementation state", () => {
    const implementation = read("docs/labs/02-multi-agent-orchestration.md");
    const integration = read("docs/labs/03-build-test-deploy.md");
    expect(implementation).toContain("CATALOGUE_URL");
    expect(implementation).toContain("Needs input");
    expect(implementation).toMatch(/Steer this\s+session/);
    expect(integration).toContain("both tested commits");
    expect(integration).toContain("browser route mocks");
    expect(integration).toContain("Stop only the service");
    expect(integration).toContain("exact reviewed service SHA");
    expect(integration).toContain("private service repo");
  });

  it("rejects app-source inspection by documentation checks", () => {
    for (const path of ["src/server/index.ts", "src/server/app.ts", "src/server/catalogue.ts"]) {
      expect(() => read(path)).toThrow("must not inspect learner implementation");
    }
  });

  it("keeps pre-work and the starter-pair receipt in one place", () => {
    const readme = read("README.md");
    expect(readme).toContain("## Pre-work");
    expect(readme).toMatch(/issues\/34#issuecomment-\d+/);
    expect(readme).not.toMatch(/\b[0-9a-f]{40}\b/i);
    expect(readme).toContain("inference/billing");
    expect(readme).toContain("long-lived credentials");
    expect(readme).toContain("--pin v1.0.1");
    expect(read("docs/labs/05-gh-aw.md")).not.toContain("gh extension install");
    expect(read("AGENTS.md")).toContain("Keep developer instructions brief");
  });

  it("keeps Azure optional and verifies the Babazon live surface", () => {
    const content = `${read("README.md")}\n${read("docs/labs/03-build-test-deploy.md")}`;
    expect(content).toMatch(/optional|advanced/i);
    for (const endpoint of ["/health", "/ready", "/api/products"]) {
      expect(content).toContain(endpoint);
    }
    expect(content).toContain("search");
    expect(content).toContain("category");
    expect(content).toContain("application page");
  });

  it("links every participant lab directly from the root README", () => {
    const readme = read("README.md");
    for (const path of participantLabs) {
      expect(readme, `README.md does not link ${path}`).toContain(`](${path})`);
    }
  });

  it("contains no legacy execution path or obsolete product language", () => {
    const forbidden = /\b(?:openspec|opsx|feedback|votes?|voting)\b|specification pull request|table storage/i;
    for (const path of ownedTextFiles) {
      expect(read(path), `${path} contains legacy terminology`).not.toMatch(forbidden);
    }
  });

  it("publishes only links to existing local Markdown files", () => {
    for (const path of ownedTextFiles.filter((file) => file.endsWith(".md"))) {
      for (const match of read(path).matchAll(/\[[^\]]+\]\((?!https?:|#)([^)#]+)(?:#[^)]+)?\)/g)) {
        const target = resolve(root, dirname(path), match[1]!);
        expect(existsSync(target), `${path} links to missing ${match[1]}`).toBe(true);
      }
    }
  });

  it("pins GA GH-AW and replaces the security lesson with bounded QA", () => {
    const lab = read("docs/labs/05-gh-aw.md");
    expect(lab).toContain("v1.0.1");
    expect(lab).toContain("generally available");
    expect(read("README.md")).toContain("2026-10-28-github-agentic-workflows-generally-available");
    expect(lab).toContain("at most one issue per failed run");
    expect(lab).toContain("failed-test-explainer");
    expect(lab).toContain("regression");
    expect(lab).toContain("Replay the same failed ID");
    expect(lab).toContain("successful");
    expect(lab).toContain("../../README.md#pre-work");
    expect(lab).not.toMatch(/CodeQL finding|security exercise|preview access|v0\.89\.21/);
    expect(existsSync(resolve(root, "scripts/seed-security-exercise.ps1"))).toBe(false);
    expect(existsSync(resolve(root, ".github/workflows/codeql.yml"))).toBe(true);
    expect(existsSync(resolve(root, ".github/workflows/dependency-review.yml"))).toBe(true);
  });

  it("preserves the separate cloud-agent revision and paired recovery evidence", () => {
    const lab = read("docs/labs/04-cloud-agent.md");
    expect(lab).toMatch(/separate from the four\s+product-discovery/);
    expect(lab).toContain("HEAD /health");
    expect(lab).toContain("Cache-Control: no-store");
    expect(lab).toContain("npm run check");
    expect(read("docs/labs/workshop-wrap-and-evidence.md")).toContain("app/service commit pair");
    expect(read(".github/skills/change-evidence/SKILL.md")).not.toContain("GH-AW preview access");
  });
});
