import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, ".script-test-output");
const readyFixture = resolve(root, "tests", "fixtures", "preflight-ready.json");
const preparedFixture = resolve(root, "tests", "fixtures", "team-repo-prepared.json");
const unpreparedFixture = resolve(root, "tests", "fixtures", "team-repo-unprepared.json");
const revision = "0123456789abcdef0123456789abcdef01234567";
const catalogueRevision = "a".repeat(40);
const catalogueRepository = "octo-workshop/team-01-catalogue";
const subscription = "00000000-0000-0000-0000-000000000001";

beforeAll(() => mkdirSync(outputDirectory, { recursive: true }));
afterAll(() => rmSync(outputDirectory, { recursive: true, force: true }));

function preflightArgs(fixture: string, output: string, includeAzure = true) {
  return [
    "-NoProfile",
    "-File",
    resolve(root, "scripts", "verify-env.ps1"),
    "-Repository",
    "octo-workshop/team-01",
    "-ExpectedRevision",
    revision,
    "-CatalogueRepository",
    catalogueRepository,
    "-CatalogueExpectedRevision",
    catalogueRevision,
    ...(includeAzure ? [
      "-IncludeAzure",
      "-AzureSubscriptionId",
      subscription,
      "-AzureResourceGroup",
      "workshop-team01-rg",
    ] : []),
    "-FixturePath",
    fixture,
    "-JsonOutput",
    output,
  ];
}

function bashPreflightArgs(fixture: string, output: string, includeAzure = true) {
  return [
    "./scripts/verify-env.sh",
    "--repository", "octo-workshop/team-01",
    "--expected-revision", revision,
    "--catalogue-repository", catalogueRepository,
    "--catalogue-expected-revision", catalogueRevision,
    ...(includeAzure ? [
      "--include-azure",
      "--azure-subscription-id", subscription,
      "--azure-resource-group", "workshop-team01-rg",
    ] : []),
    "--fixture", relative(root, fixture).replaceAll("\\", "/"),
    "--json-output", relative(root, output).replaceAll("\\", "/"),
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
  it("passes a single version argument in the live path instead of splatting characters", () => {
    const scriptPath = resolve(root, "scripts", "verify-env.ps1").replaceAll("'", "''");
    const script = `
$ErrorActionPreference = 'Stop'
$IncludeAzure = $false
$Repository = 'octo-workshop/team-01'
$CatalogueRepository = 'octo-workshop/team-01-catalogue'
function git {
  if ($args.Count -ne 1 -or $args[0] -ne '--version') { throw 'Incorrect git version arguments' }
  $global:LASTEXITCODE = 0
  'git version 2.51.0'
}
function node {
  if ($args.Count -ne 1 -or $args[0] -ne '--version') { throw 'Incorrect node version arguments' }
  $global:LASTEXITCODE = 0
  'v20.19.5'
}
function npm {
  if ($args.Count -ne 1 -or $args[0] -ne '--version') { throw 'Incorrect npm version arguments' }
  $global:LASTEXITCODE = 0
  '10.8.2'
}
function gh {
  if ($args.Count -eq 1 -and $args[0] -eq '--version') {
    $global:LASTEXITCODE = 0
    'gh version 2.80.0'
  } elseif (($args -join ' ') -eq 'auth status') {
    $global:LASTEXITCODE = 1
  } else { throw 'Unexpected network command in live-probe test' }
}
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath}', [ref]$tokens, [ref]$errors)
$definition = $ast.Find({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-LiveState'
}, $true)
. ([scriptblock]::Create($definition.Extent.Text))
$state = Get-LiveState
$state.tools | ConvertTo-Json -Compress
exit 0
`;
    const output = execFileSync("pwsh", ["-NoProfile", "-Command", script], { cwd: root, encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({
      git: "git version 2.51.0", node: "v20.19.5", npm: "10.8.2", gh: "gh version 2.80.0",
    });
  }, 20_000);

  it("returns green structured evidence while keeping Copilot App manual", () => {
    const output = resolve(outputDirectory, "powershell-ready.json");
    execFileSync("pwsh", preflightArgs(readyFixture, output), { cwd: root });
    const report = JSON.parse(readFileSync(output, "utf8"));
    expect(report.summary.fail).toBe(0);
    expect(report.evidenceSource).toBe("fixture");
    expect(report.results).toContainEqual(expect.objectContaining({ id: "copilot.app", status: "MANUAL" }));
  }, 90_000);

  it.each([
    ["missing tool", (state: Record<string, unknown>) => ((state.tools as Record<string, unknown>).az = null), "tool.az"],
    ["failed auth", (state: Record<string, unknown>) => (state.ghAuthenticated = false), "auth.github"],
    ["wrong app identity", (state: Record<string, unknown>) => (state.repository = "octo-workshop/wrong-app"), "repository.identity"],
    ["wrong revision", (state: Record<string, unknown>) => (state.provenanceVerified = false), "repository.template-revision"],
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
    const output = resolve(outputDirectory, "bash-ready.json");
    execFileSync(
      "bash",
      bashPreflightArgs(readyFixture, output),
      { cwd: root },
    );
    const report = JSON.parse(readFileSync(resolve(root, output), "utf8"));
    expect(report.summary.fail).toBe(0);
    expect(report.evidenceSource).toBe("fixture");
    expect(report.results).toContainEqual(expect.objectContaining({ id: "copilot.app", status: "MANUAL" }));
  }, 90_000);

  it("supports local-only participation and new template history in both shells", () => {
    const fixture = writeDerivedFixture("local-only", (state) => {
      (state.tools as Record<string, unknown>).az = null;
      (state.tools as Record<string, unknown>).copilot = null;
      state.azAuthenticated = false;
      state.immutableOidc = false;
      state.cloudValidation = false;
      state.environments = [];
    });
    const psOutput = resolve(outputDirectory, "local-ps.json");
    const bashOutput = resolve(outputDirectory, "local-bash.json");
    execFileSync("pwsh", preflightArgs(fixture, psOutput, false), { cwd: root });
    execFileSync("bash", bashPreflightArgs(fixture, bashOutput, false), { cwd: root });
    const classifications: string[][] = [];
    for (const output of [psOutput, bashOutput]) {
      const report = JSON.parse(readFileSync(output, "utf8")) as {
        summary: { fail: number };
        results: Array<{ id: string; status: string }>;
        catalogueRepository: string;
        sourceRevisions: { catalogue: string };
        startingCommits: { catalogue: string };
      };
      expect(report.summary.fail).toBe(0);
      expect(report.catalogueRepository).toBe(catalogueRepository);
      expect(report.sourceRevisions.catalogue).toBe(catalogueRevision);
      expect(report.startingCommits.catalogue).toBe("2".repeat(40));
      expect(report.results.some(({ id }) => /azure|oidc|environment|tool\.az/.test(id))).toBe(false);
      for (const id of ["copilot.app", "copilot.project", "copilot.fusion", "ghaw.engine"]) {
        expect(report.results).toContainEqual(expect.objectContaining({ id, status: "MANUAL" }));
      }
      classifications.push(report.results.map(({ id, status }) => `${id}:${status}`).sort());
    }
    expect(classifications[0]).toEqual(classifications[1]);
  }, 90_000);

  it.each([
    ["identity", (catalogue: Record<string, unknown>) => {
      (catalogue.repository as Record<string, unknown>).fullName = "octo-workshop/wrong-service";
    }, "catalogue.identity"],
    ["contents", (catalogue: Record<string, unknown>) => { catalogue.provenanceVerified = false; }, "catalogue.template-revision"],
    ["actions", (catalogue: Record<string, unknown>) => {
      (catalogue.repository as Record<string, unknown>).actionsEnabled = false;
    }, "catalogue.actions"],
  ])("blocks invalid companion %s in both shells", (name, update, expectedId) => {
    const fixture = writeDerivedFixture(`catalogue-${name}`, (state) => {
      update(state.catalogue as Record<string, unknown>);
    });
    for (const shell of ["pwsh", "bash"]) {
      const output = resolve(outputDirectory, `catalogue-${name}-${shell}.json`);
      const args = shell === "pwsh"
        ? preflightArgs(fixture, output, false)
        : bashPreflightArgs(fixture, output, false);
      const run = spawnSync(shell, args, { cwd: root, encoding: "utf8" });
      expect(run.status, `${run.stdout}${run.stderr}`).toBe(1);
      const report = JSON.parse(readFileSync(output, "utf8"));
      expect(report.results).toContainEqual(expect.objectContaining({ id: expectedId, status: "FAIL" }));
    }
  }, 90_000);
});

function preparationArgs(fixture: string, output: string, includeAzure = true) {
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
    "-CatalogueRepository",
    catalogueRepository,
    "-CatalogueTemplateRevision",
    catalogueRevision,
    "-TeamSize",
    "3",
    "-TeamId",
    "team01",
    ...(includeAzure ? [
      "-IncludeAzure",
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
    ] : []),
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
  it("checks starter gaps only in instructor preparation", () => {
    const scriptPath = resolve(root, "scripts", "prepare-team-repo.ps1").replaceAll("'", "''");
    const script = `
$ErrorActionPreference = 'Stop'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile('${scriptPath}', [ref]$tokens, [ref]$errors)
$definition = $ast.Find({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-StarterGaps'
}, $true)
. ([scriptblock]::Create($definition.Extent.Text))
$baseline = @{ ServerSource = 'health and readiness'; IndexSource = 'createCatalogue()'; CatalogueSource = 'new InMemoryProductCatalogue()' }
$cases = @(
  (Test-StarterGaps @baseline),
  (Test-StarterGaps -ServerSource $baseline.ServerSource -IndexSource 'process.env.CATALOGUE_URL' -CatalogueSource $baseline.CatalogueSource),
  (Test-StarterGaps -ServerSource $baseline.ServerSource -IndexSource $baseline.IndexSource -CatalogueSource 'CATALOGUE_URL; new InMemoryProductCatalogue()'),
  (Test-StarterGaps -ServerSource $baseline.ServerSource -IndexSource $baseline.IndexSource -CatalogueSource 'new HttpCatalogue()'),
  (Test-StarterGaps -ServerSource 'Cache-Control: no-store' -IndexSource $baseline.IndexSource -CatalogueSource $baseline.CatalogueSource)
)
$cases | ConvertTo-Json -Compress
`;
    const results = JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", script], {
      cwd: root, encoding: "utf8",
    }));
    expect(results).toEqual([
      { appIntegrationBaselineGapVerified: true, cloudAgentBaselineGapVerified: true },
      { appIntegrationBaselineGapVerified: false, cloudAgentBaselineGapVerified: true },
      { appIntegrationBaselineGapVerified: false, cloudAgentBaselineGapVerified: true },
      { appIntegrationBaselineGapVerified: false, cloudAgentBaselineGapVerified: true },
      { appIntegrationBaselineGapVerified: true, cloudAgentBaselineGapVerified: false },
    ]);
  }, 20_000);

  it("plans both repos without the retired security exercise", () => {
    const output = resolve(outputDirectory, "unprepared.json");
    execFileSync("pwsh", preparationArgs(unpreparedFixture, output), { cwd: root });
    const report = JSON.parse(readFileSync(output, "utf8"));
    expect(report.teamSize).toBe(3);
    expect(report.catalogueRepository).toBe(catalogueRepository);
    expect(JSON.stringify(report.operations)).not.toContain("security exercise");
    expect(report.operations).toContainEqual(expect.objectContaining({
      action: "VERIFY",
      resource: "repository topology",
      detail: expect.stringContaining(catalogueRepository),
    }));
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

  it("prepares local teams without Azure configuration or environment writes", () => {
    const output = resolve(outputDirectory, "local-preparation.json");
    execFileSync("pwsh", preparationArgs(unpreparedFixture, output, false), { cwd: root });
    const report = JSON.parse(readFileSync(output, "utf8")) as {
      includeAzure: boolean;
      azureScope: null;
      environments: string[];
      operations: Array<{ resource: string }>;
    };
    expect(report.includeAzure).toBe(false);
    expect(report.azureScope).toBeNull();
    expect(report.environments).toEqual([]);
    expect(report.operations.some(({ resource }) => /environment|oidc/i.test(resource))).toBe(false);
    expect(report.operations).toContainEqual(expect.objectContaining({ resource: "copilot project" }));
  }, 20_000);

  it("rejects a companion whose starter contents changed", () => {
    const fixture = writeDerivedFixture("changed-catalogue", (state) => {
      Object.assign(state, JSON.parse(readFileSync(unpreparedFixture, "utf8")));
      (state.catalogue as Record<string, unknown>).provenanceVerified = false;
    });
    const run = spawnSync("pwsh", preparationArgs(fixture, resolve(outputDirectory, "changed-catalogue.json"), false), {
      cwd: root, encoding: "utf8",
    });
    expect(run.status).not.toBe(0);
    expect(stripVTControlCharacters(`${run.stdout}${run.stderr}`)).toContain("Catalogue template provenance failed");
  }, 20_000);

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

  it("rejects a pre-solved app integration before preparation writes", () => {
    const fixture = writeDerivedFixture("completed-app-integration", (state) => {
      Object.assign(state, JSON.parse(readFileSync(unpreparedFixture, "utf8")));
      state.appIntegrationBaselineGapVerified = false;
    });
    const run = spawnSync(
      "pwsh",
      preparationArgs(fixture, resolve(outputDirectory, "completed-app-integration-report.json"), false),
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).not.toBe(0);
    const output = stripVTControlCharacters(`${run.stdout}${run.stderr}`).replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ");
    expect(output).toContain("leave CATALOGUE_URL integration for learners");
    expect(run.stdout).not.toContain("[CREATE]");
    expect(run.stdout).not.toContain("[UPDATE]");
  }, 20_000);
});
