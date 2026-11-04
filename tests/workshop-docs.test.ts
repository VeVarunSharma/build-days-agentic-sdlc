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

const read = (path: string) => readFileSync(resolve(root, path), "utf8");

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
    expect(content).toContain("owned paths");
    expect(content).toContain("prohibited paths");
    expect(content).toContain("dependencies");
  });

  it("teaches Plan, Fleet, sessions, steering, and Autopilot", () => {
    const content = read("docs/labs/02-multi-agent-orchestration.md");
    for (const concept of ["Interactive mode", "Fleet", "session", "Autopilot", "Pause. Re-read"]) {
      expect(content).toContain(concept);
    }
  });

  it("starts with Fusion and a Project containing the app and service copies", () => {
    const readme = read("README.md");
    const lab = read("docs/labs/01-outcome-and-plan.md");
    expect(readme.indexOf("Try Copilot Fusion first")).toBeLessThan(readme.indexOf("| Lab |"));
    for (const link of [
      "https://benchmarks.github.com/",
      "https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/",
      "https://docs.github.com/en/copilot/concepts/models/copilot-fusion",
      "https://github.com/VeVarunSharma/babazon-catalogue-service",
    ]) {
      expect(readme).toContain(link);
      expect(lab).toContain(link);
    }
    expect(lab).toContain("Fusion High");
    expect(lab).toContain("Do not implement");
    expect(lab).toContain("Projects is public preview");
    expect(lab).toContain("both participant repositories");
    expect(lab).toContain("owner/repo#number");
    expect(lab).toContain("contracts/catalogue-v1.schema.json");
    expect(readme).toContain("Use this template");
  });

  it("leaves queries and the HTTP adapter to participants and proves the real boundary", () => {
    const implementation = read("docs/labs/02-multi-agent-orchestration.md");
    const integration = read("docs/labs/03-build-test-deploy.md");
    expect(implementation).toContain("published app starter does not support it yet");
    expect(implementation).toContain("CATALOGUE_URL");
    expect(implementation).toContain("Needs input");
    expect(implementation).toContain("Steer this session");
    expect(integration).toContain("both tested commits");
    expect(integration).toContain("browser route mock alone does not prove service behavior");
    expect(integration).toContain("Stop the service");
    expect(integration).toContain("exact reviewed service SHA");
    expect(integration).toContain("private service repo");
    expect(read("src/server/catalogue.ts")).toContain("new InMemoryProductCatalogue()");
    expect(read("src/server/index.ts")).not.toContain("CATALOGUE_URL");
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
    expect(lab).toContain("2026-10-28-github-agentic-workflows-generally-available");
    expect(lab).toMatch(/exactly\s+one publishing output type/);
    expect(lab).toContain("failed-test-explainer");
    expect(lab).toContain("regression-test");
    expect(lab).toContain("Replay the same failed ID");
    expect(lab).toContain("successful");
    expect(lab).toContain("centralized Copilot billing");
    expect(lab).not.toMatch(/CodeQL finding|security exercise|preview access|v0\.89\.21/);
    expect(existsSync(resolve(root, "scripts/seed-security-exercise.ps1"))).toBe(false);
    expect(existsSync(resolve(root, ".github/workflows/codeql.yml"))).toBe(true);
    expect(existsSync(resolve(root, ".github/workflows/dependency-review.yml"))).toBe(true);
  });

  it("preserves the separate cloud-agent revision and paired recovery evidence", () => {
    const lab = read("docs/labs/04-cloud-agent.md");
    expect(lab).toContain("separate from the four product-discovery");
    expect(lab).toContain("HEAD /health");
    expect(read("src/server/app.ts")).not.toContain("no-store");
    expect(read("docs/labs/workshop-wrap-and-evidence.md")).toContain("app/service commit pair");
    expect(read(".github/skills/change-evidence/SKILL.md")).not.toContain("GH-AW preview access");
  });
});
