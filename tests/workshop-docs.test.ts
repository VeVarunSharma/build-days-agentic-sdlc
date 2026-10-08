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
    expect(content).toContain("product search and category");
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

  it("pins GH-AW and permits exactly one safe output", () => {
    const lab = read("docs/labs/05-gh-aw.md");
    expect(lab).toContain("v0.89.21");
    expect(lab).toContain("exactly one safe output");
    expect(read(".github/workflows/issue-clarifier.md")).toContain("max: 1");
  });
});
