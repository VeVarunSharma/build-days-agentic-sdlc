import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, ".script-test-output");
const readyFixture = resolve(root, "tests", "fixtures", "preflight-ready.json");
const preparedFixture = resolve(root, "tests", "fixtures", "team-repo-prepared.json");
const unpreparedFixture = resolve(root, "tests", "fixtures", "team-repo-unprepared.json");
const revision = "0123456789abcdef0123456789abcdef01234567";
const subscription = "00000000-0000-0000-0000-000000000001";

beforeAll(() => mkdirSync(outputDirectory, { recursive: true }));
afterAll(() => rmSync(outputDirectory, { recursive: true, force: true }));

function preflightArgs(fixture: string, output: string) {
  return [
    "-NoProfile",
    "-File",
    resolve(root, "scripts", "verify-env.ps1"),
    "-Repository",
    "octo-workshop/team-01",
    "-ExpectedRevision",
    revision,
    "-AzureSubscriptionId",
    subscription,
    "-AzureResourceGroup",
    "workshop-team01-rg",
    "-FixturePath",
    fixture,
    "-JsonOutput",
    output,
  ];
}

function writeDerivedFixture(name: string, update: (state: Record<string, unknown>) => void) {
  const state = JSON.parse(readFileSync(readyFixture, "utf8")) as Record<string, unknown>;
  update(state);
  const path = resolve(outputDirectory, `${name}.json`);
  writeFileSync(path, JSON.stringify(state));
  return path;
}

describe("environment preflight", () => {
  it("returns green structured evidence while keeping Copilot App manual", () => {
    const output = resolve(outputDirectory, "powershell-ready.json");
    execFileSync("pwsh", preflightArgs(readyFixture, output), { cwd: root });
    const report = JSON.parse(readFileSync(output, "utf8"));
    expect(report.summary.fail).toBe(0);
    expect(report.results).toContainEqual(expect.objectContaining({ id: "copilot.app", status: "MANUAL" }));
  }, 90_000);

  it.each([
    ["missing tool", (state: Record<string, unknown>) => ((state.tools as Record<string, unknown>).az = null), "tool.az"],
    ["failed auth", (state: Record<string, unknown>) => (state.ghAuthenticated = false), "auth.github"],
    ["wrong revision", (state: Record<string, unknown>) => (state.revisionContainsExpected = false), "repository.template-revision"],
    ["missing configuration", (state: Record<string, unknown>) => (state.environments = ["workshop"]), "github.environment.workshop-validation"],
    ["cloud validation not run", (state: Record<string, unknown>) => (state.cloudValidation = false), "cloud.oidc-infrastructure"],
  ])("fails actionably for %s", (name, update, expectedId) => {
    const fixture = writeDerivedFixture(name.replaceAll(" ", "-"), update);
    const output = resolve(outputDirectory, `${name.replaceAll(" ", "-")}-report.json`);
    const run = spawnSync("pwsh", preflightArgs(fixture, output), { cwd: root, encoding: "utf8" });
    expect(run.status).toBe(1);
    const report = JSON.parse(readFileSync(output, "utf8"));
    expect(report.results).toContainEqual(
      expect.objectContaining({ id: expectedId, status: "FAIL", remediation: expect.any(String) }),
    );
  }, 90_000);

  it("provides equivalent Bash classifications", () => {
    const output = ".script-test-output/bash-ready.json";
    execFileSync(
      "bash",
      [
        "./scripts/verify-env.sh",
        "--repository",
        "octo-workshop/team-01",
        "--expected-revision",
        revision,
        "--azure-subscription-id",
        subscription,
        "--azure-resource-group",
        "workshop-team01-rg",
        "--fixture",
        "tests/fixtures/preflight-ready.json",
        "--json-output",
        output,
      ],
      { cwd: root },
    );
    const report = JSON.parse(readFileSync(resolve(root, output), "utf8"));
    expect(report.summary.fail).toBe(0);
    expect(report.results).toContainEqual(expect.objectContaining({ id: "copilot.app", status: "MANUAL" }));
  }, 90_000);
});

function preparationArgs(fixture: string, output: string) {
  return [
    "-NoProfile",
    "-File",
    resolve(root, "scripts", "prepare-team-repo.ps1"),
    "-Organization",
    "octo-workshop",
    "-Repository",
    "team-01",
    "-TemplateRepository",
    "octo-workshop/workshop-template",
    "-TemplateRevision",
    revision,
    "-TeamSize",
    "3",
    "-TeamId",
    "team01",
    "-AzureSubscriptionId",
    subscription,
    "-AzureTenantId",
    "00000000-0000-0000-0000-000000000002",
    "-AzureClientId",
    "00000000-0000-0000-0000-000000000004",
    "-AzureResourceGroup",
    "workshop-team01-rg",
    "-EntraApplicationObjectId",
    "00000000-0000-0000-0000-000000000003",
    "-Confirmation",
    "PREPARE",
    "-FixturePath",
    fixture,
    "-StateOutput",
    output,
    "-DryRun",
  ];
}

describe("team repository preparation", () => {
  it("plans supported settings and deliberately excludes the security branch and PR", () => {
    const output = resolve(outputDirectory, "unprepared.json");
    execFileSync("pwsh", preparationArgs(unpreparedFixture, output), { cwd: root });
    const report = JSON.parse(readFileSync(output, "utf8"));
    expect(report.teamSize).toBe(3);
    expect(report.operations).toContainEqual(
      expect.objectContaining({ action: "SKIP", resource: "security exercise branch/PR" }),
    );
    expect(report.operations).toContainEqual(
      expect.objectContaining({ action: "CREATE", resource: "issue:Babazon: product search and category filtering" }),
    );
  }, 20_000);

  it("is stable on consecutive prepared-state runs", () => {
    const first = resolve(outputDirectory, "prepared-first.json");
    const second = resolve(outputDirectory, "prepared-second.json");
    execFileSync("pwsh", preparationArgs(preparedFixture, first), { cwd: root });
    execFileSync("pwsh", preparationArgs(preparedFixture, second), { cwd: root });
    const normalize = (path: string) => {
      const report = JSON.parse(readFileSync(path, "utf8")) as {
        generatedAt?: string;
        operations: Array<{ action: string; resource: string }>;
        [key: string]: unknown;
      };
      delete report.generatedAt;
      return report;
    };
    const firstReport = normalize(first);
    expect(firstReport).toEqual(normalize(second));
    expect(firstReport.operations.filter((operation) => operation.resource.startsWith("issue:")))
      .toEqual([
        expect.objectContaining({ action: "VERIFY" }),
        expect.objectContaining({ action: "VERIFY" }),
      ]);
  }, 30_000);

  it("rejects wildcard or name-only federation", () => {
    const fixture = writeDerivedFixture("bad-oidc", (state) => {
      Object.assign(state, JSON.parse(readFileSync(unpreparedFixture, "utf8")));
      const credentials = state.federatedCredentials as Array<Record<string, unknown>>;
      credentials[0]!.subject = "repo:octo-workshop/team-01:environment:*";
    });
    const run = spawnSync("pwsh", preparationArgs(fixture, resolve(outputDirectory, "bad-oidc-report.json")), {
      cwd: root,
      encoding: "utf8",
    });
    expect(run.status).not.toBe(0);
    expect(`${run.stdout}${run.stderr}`).toContain("OIDC readiness failed");
  }, 20_000);

  it("rejects a template that already completed the cloud-agent exercise", () => {
    const fixture = writeDerivedFixture("completed-cloud-agent-gap", (state) => {
      Object.assign(state, JSON.parse(readFileSync(unpreparedFixture, "utf8")));
      state.cloudAgentBaselineGapVerified = false;
    });
    const run = spawnSync(
      "pwsh",
      preparationArgs(fixture, resolve(outputDirectory, "completed-cloud-agent-gap-report.json")),
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).not.toBe(0);
    const normalizedOutput = stripVTControlCharacters(`${run.stdout}${run.stderr}`)
      .replace(/\s*\|\s*/g, " ")
      .replace(/\s+/g, " ");
    expect(normalizedOutput).toContain(
      "already contains the Lab 4 no-store cache policy",
    );
  }, 20_000);
});
