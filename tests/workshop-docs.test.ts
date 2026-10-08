import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const coreLabs = [
  "docs/labs/01-outcome-and-plan.md",
  "docs/labs/02-multi-agent-orchestration.md",
  "docs/labs/03-build-test-deploy.md",
  "docs/labs/04-foundry-mission-planner.md",
  "docs/labs/05-gh-aw.md",
];
const wrapUp = "docs/labs/workshop-wrap-and-evidence.md";
const capstoneLab = "docs/labs/06-open-agentic-capstone.md";
const participantLabs = [
  ...coreLabs,
  capstoneLab,
  wrapUp,
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
  it("keeps five core labs, one optional capstone, and the wrap-up under docs", () => {
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

  it("makes the Foundry lab App-first, gated, real, and cleanable", () => {
    const lab = read("docs/labs/04-foundry-mission-planner.md");
    const compactLab = lab.replace(/\s+/g, " ");
    for (const required of [
      "Copilot App Interactive mode",
      "foundry/",
      "azd env new <unique-name>",
      "unique",
      "subscription",
      "location",
      "resource group",
      "model name/version",
      "explicit review",
      "azd provision",
      "npm run foundry:render",
      "npm run foundry:deploy-agent",
      "smoke-reading-nook",
      "FOUNDRY_PROJECT_ENDPOINT",
      "FOUNDRY_AGENT_NAME",
      "Build my basket",
      "add the validated bundle to the cart",
      "azd down",
      "permissions",
      "region/model availability",
      "quota",
      "capability-unavailable",
      "organizer-provided",
      "not evidence that Foundry worked",
    ]) {
      expect(compactLab).toContain(required);
    }
    expect(compactLab).toContain("never commit their values");
    expect(compactLab).toContain(
      "Never present mocks, fixtures, or local-only tests as a fallback.",
    );
    expect(existsSync(resolve(root, "docs/labs/04-cloud-agent.md"))).toBe(false);
  });

  it("links every participant lab directly from the root README", () => {
    const readme = read("README.md");
    for (const path of participantLabs) {
      expect(readme, `README.md does not link ${path}`).toContain(`](${path})`);
    }
  });

  it("keeps the capstone open-domain, mode-led, Foundry-backed, and not issue-first", () => {
    const lab = read(capstoneLab).replace(/\s+/g, " ");
    const capstone = read("capstone/README.md").replace(/\s+/g, " ");
    for (const required of [
      "not issue-first",
      "Copilot App Chat or Explore",
      "Copilot App Plan mode",
      "Copilot App Interactive mode",
      "Fleet with two to four isolated sessions",
      "deploy one prompt agent",
      "server using Entra authentication",
      "user-facing",
      "deterministic",
      "Playwright",
      "cleanup owner",
      "extend Babazon",
      "capstone/<app-name>",
    ]) {
      expect(`${lab} ${capstone}`).toContain(required);
    }
    expect(lab).toContain("A portal playground, raw model call, fixture, or mock is not deployed-agent evidence.");
    expect(read("README.md")).toContain("## Optional capstone");
    expect(read("AGENTS.md")).toContain("## Optional capstone exception");
  });

  it("ships no completed capstone application", () => {
    const entries = readdirSync(resolve(root, "capstone"), {
      withFileTypes: true,
    }).map((entry) => entry.name).sort();
    expect(entries).toEqual(["AGENTS.md", "README.md", "foundry-template"]);
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
    const stretch = lab.slice(lab.indexOf("## Stretch"));
    const core = lab.slice(0, lab.indexOf("## Stretch"));
    const compactCore = core.replace(/\s+/g, " ");
    expect(compactCore).toContain("CodeQL");
    expect(compactCore).toContain("required security evidence");
    expect(core).not.toContain("GH-AW");
    expect(stretch).toContain("v0.89.21");
    expect(stretch).toContain("Create or update");
    expect(stretch).toContain("Then run it");
    expect(stretch).toContain("exactly one safe output");
    expect(read(".github/workflows/issue-clarifier.md")).toContain("max: 1");
  });
});
