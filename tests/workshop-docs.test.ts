import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const coreLabs = [
  ["docs/labs/01-SDD-with-the-GHCP-app.md", "SDD with the GitHub Copilot App"],
  ["docs/labs/02-multi-agent-orchestration.md", "Multi-agent orchestration"],
  ["docs/labs/03-build-test-deploy.md", "Build, test, deploy"],
  ["docs/labs/04-cloud-agent.md", "Cloud agent"],
  ["docs/labs/05-gh-aw.md", "Agentic workflows"],
] as const;
const capstone = "docs/labs/optional-capstone.md";
const participantLabs = [...coreLabs.map(([path]) => path), capstone];
const ownedTextFiles = [
  "README.md", "AGENTS.md", "DESIGN.md", ...participantLabs,
  ".github/copilot-instructions.md",
  ".github/skills/change-evidence/SKILL.md",
  ".github/agents/evidence-reviewer.agent.md",
];

const read = (path: string) => {
  if (!path.endsWith(".md")) {
    throw new Error("Documentation checks must not inspect learner implementation files.");
  }
  return readFileSync(resolve(root, path), "utf8");
};
const prose = (path: string) => read(path).replace(/\s+/g, " ");
const slug = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");

function listMarkdownFiles(directory: string, prefix = ""): string[] {
  return readdirSync(resolve(root, directory, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return listMarkdownFiles(directory, relative);
      return entry.name.endsWith(".md") ? [`${directory}/${relative}`] : [];
    }).sort();
}

describe("Session-first workshop documentation", () => {
  it("keeps five core labs followed by the optional capstone", () => {
    expect(listMarkdownFiles("docs")).toEqual([...participantLabs].sort());
    const readme = read("README.md");
    const indexLinks = [...readme.matchAll(/^\| \[[^\]]+\]\((docs\/labs\/[^)]+)\)/gm)]
      .map((match) => match[1]);
    expect(indexLinks).toEqual(participantLabs);
    const text = prose(capstone);
    expect(text).toContain("advanced participants");
    expect(text).toContain("not required for workshop completion");
    expect(text).toContain("Your own idea is welcome");
  });

  it("keeps instructor preparation out of the participant README", () => {
    expect(read("README.md")).not.toContain("<summary>Instructor preparation</summary>");
    expect(read("README.md")).not.toContain("prepare-team-repo.ps1");
  });

  it.each(coreLabs)("uses the requested title for %s", (path, title) => {
    expect(read(path).split(/\r?\n/)[0]).toBe(`# Lab ${coreLabs.findIndex(([file]) => file === path) + 1}: ${title}`);
    expect(read("README.md")).toContain(`${title}](${path})`);
  });

  it.each(participantLabs)("%s gives a location, result, recovery, and navigation", (path) => {
    const text = read(path);
    for (const section of [
      "## Outcome", "## Prerequisites", "## Expected repository artifacts",
      "## Verification", "## Recovery", "## Stretch",
    ]) {
      expect(text, `${path} is missing ${section}`).toContain(section);
    }
    for (const field of ["**Use:**", "**Attach:**", "**Prompt:**", "**Expect:**", "**Decide:**"]) {
      expect(text, `${path} is missing ${field}`).toContain(field);
    }
    expect(text).toContain("[README](../../README.md)");
    const index = participantLabs.indexOf(path);
    if (index > 0) expect(text).toContain(`](${participantLabs[index - 1]!.split("/").at(-1)})`);
    if (index < participantLabs.length - 1) expect(text).toContain(`](${participantLabs[index + 1]!.split("/").at(-1)})`);
  });

  it("puts the real banner first, without ASCII, and keeps labs before setup", () => {
    const readme = read("README.md");
    const setup = readme.indexOf("## Open your repo in a Session");
    expect(setup).toBeGreaterThan(0);
    expect(readme).toContain("**[Start Lab 1:");
    for (const path of participantLabs) {
      const position = readme.indexOf(`](${path})`);
      expect(position).toBeGreaterThan(-1);
      expect(position).toBeLessThan(setup);
    }
    expect(readme).not.toContain("```text");
    const image = readme.match(/^!\[([^\]]+)\]\((docs\/assets\/build-days-banner\.png)\)/);
    expect(image).not.toBeNull();
    expect(image![1]).toContain("Build Days");
    expect(readme.indexOf(image![0])).toBe(0);
    const bytes = readFileSync(resolve(root, image![2]!));
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(0);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(0);
  });

  it("teaches a repository Session and native SDD with Fusion", () => {
    const readme = prose("README.md");
    const lab = prose(coreLabs[0][0]);
    for (const direction of ["Sessions > +", "Start session in", "This computer", "New worktree", "Interactive", "Copilot Fusion"]) {
      expect(readme).toContain(direction);
    }
    expect(readme).toContain("**Sessions**, not **Projects**");
    for (const concept of ["Interactive", "**Plan**", "Plan canvas", "Autopilot", "specification", "exactly four", "owned paths", "prohibited paths"]) {
      expect(lab).toContain(concept);
    }
    expect(lab).toContain("Do not implement");
    expect(lab).toContain("price low-to-high/high-to-low");
    expect(lab).toContain("equal prices");
    expect(readme).toContain("https://benchmarks.github.com/");
    expect(readme).toContain("project-hydrafusion-frontier-quality-via-multi-model-orchestration");
    expect(readme).toContain("github-copilot-app-reference/built-in-skills");
  });

  it("coordinates bounded agents in this repo without a Project prerequisite", () => {
    const lab = prose(coreLabs[1][0]);
    for (const concept of ["main repository Session", "/orchestrate", "this repo only", "isolated session/worktree", "Do not merge"]) {
      expect(lab).toContain(concept);
    }
    expect(read(coreLabs[1][0]).split("## Stretch")[1]).toContain("/fleet");
    for (const path of ownedTextFiles) {
      expect(read(path), `${path} retains the removed setup`).not.toMatch(
        /Projects\s*>\s*\+|CatalogueRepository|CATALOGUE_URL|starter pair|both tested SHAs|app\/service commit/i,
      );
      expect(read(path)).not.toMatch(/\b(?:openspec|opsx|spec.?kit)\b/i);
    }
  });

  it("keeps learner checks independent of application source", () => {
    for (const path of ["src/server/index.ts", "src/server/app.ts", "src/shared/contracts.ts"]) {
      expect(() => read(path)).toThrow("must not inspect learner implementation");
    }
    expect(read("AGENTS.md")).toContain("Keep developer instructions brief");
  });

  it("preserves build/deploy, Cloud agent revision, and bounded QA", () => {
    const build = read(coreLabs[2][0]);
    for (const value of ["npm run check", "npm start", "Optional deployment", "/health", "/ready", "/api/products", "OIDC"]) {
      expect(build).toContain(value);
    }
    const cloud = prose(coreLabs[3][0]);
    expect(cloud).toContain("separate from the four sorting children");
    expect(cloud).toContain("Cache-Control: no-store");
    expect(cloud).toContain("HEAD /health");
    const qa = prose(coreLabs[4][0]);
    for (const value of ["v1.0.1", "generally available", "at most one issue per failed run", "failed-test-explainer", "Replay the same failed ID", "successful CI ID"]) {
      expect(qa).toContain(value);
    }
    expect(qa).not.toMatch(/CodeQL finding|security exercise|preview access/);
    expect(existsSync(resolve(root, ".github/workflows/codeql.yml"))).toBe(true);
    expect(existsSync(resolve(root, ".github/workflows/dependency-review.yml"))).toBe(true);
  });

  it("keeps all local links and heading anchors valid", () => {
    for (const path of ownedTextFiles) {
      for (const match of read(path).matchAll(/\[[^\]]+\]\((?!https?:)([^)]+)\)/g)) {
        const [file, anchor] = match[1]!.split("#");
        const target = file ? resolve(root, dirname(path), file) : resolve(root, path);
        expect(existsSync(target), `${path} links to missing ${match[1]}`).toBe(true);
        if (anchor && target.endsWith(".md")) {
          const headings = [...readFileSync(target, "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)]
            .map((heading) => slug(heading[1]!.trim()));
          expect(headings, `${path} links to missing anchor ${match[1]}`).toContain(anchor);
        }
      }
    }
  });

  it("keeps the complete participant path within its agreed text budget", () => {
    const words = ["README.md", ...participantLabs]
      .reduce((sum, path) => sum + (read(path).match(/\S+/g)?.length ?? 0), 0);
    expect(words).toBeLessThanOrEqual(3000);
  });
});
