import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parse } from "yaml";
import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(".github/workflows/failed-test-explainer.md", "utf8");
const frontmatter = source.split(/^---\r?$/m)[1];
const workflow = z.object({
  on: z.object({
    workflow_run: z.object({
      workflows: z.array(z.string()),
      branches: z.array(z.string()),
      conclusion: z.string(),
    }),
    workflow_dispatch: z.object({
      inputs: z.object({ run_id: z.object({ required: z.boolean() }) }),
    }),
  }),
  permissions: z.record(z.string(), z.string()),
  checkout: z.boolean(),
  concurrency: z.object({ group: z.string(), "cancel-in-progress": z.boolean() }),
  jobs: z.object({
    inspect_ci: z.object({
      permissions: z.record(z.string(), z.string()),
      steps: z.array(z.object({
        id: z.string(),
        with: z.object({ script: z.string() }),
      })),
    }),
    agent: z.object({ needs: z.array(z.string()), if: z.string() }),
    safe_outputs: z.object({ needs: z.array(z.string()), if: z.string() }),
  }),
  "safe-outputs": z.object({
    "create-issue": z.object({
      max: z.number(),
      "title-prefix": z.string(),
      "deduplicate-by-title": z.boolean(),
    }),
    "report-failure-as-issue": z.boolean(),
    "report-failed-jobs": z.boolean(),
    "report-missing-tool": z.object({ "create-issue": z.boolean() }),
    "report-missing-data": z.object({ "create-issue": z.boolean() }),
    "report-incomplete": z.object({ "create-issue": z.boolean() }),
    noop: z.object({ "report-as-issue": z.boolean() }),
  }).strict(),
}).parse(parse(frontmatter ?? ""));
const inspectionScript = workflow.jobs.inspect_ci.steps[0]!.with.script;

interface Run {
  id: number;
  workflow_id: number;
  repository: { id: number };
  head_repository: { id: number } | null;
  status: string;
  conclusion: string | null;
  head_sha: string;
  html_url: string;
}

interface Issue {
  title: string;
  html_url: string;
  pull_request?: object;
}

async function inspect({
  rawId = "123",
  eventName = "workflow_dispatch",
  run = {},
  pages = [[]],
  failLookup = false,
}: {
  rawId?: string;
  eventName?: string;
  run?: Partial<Run>;
  pages?: Issue[][];
  failLookup?: boolean;
} = {}) {
  const outputs: Record<string, string> = {};
  const notices: string[] = [];
  const result: Run = {
    id: 123,
    workflow_id: 7,
    repository: { id: 42 },
    head_repository: { id: 42 },
    status: "completed",
    conclusion: "failure",
    head_sha: "a".repeat(40),
    html_url: "https://github.com/octo/shop/actions/runs/123",
    ...run,
  };
  const getWorkflowRun = vi.fn().mockResolvedValue({ data: result });
  if (failLookup) getWorkflowRun.mockRejectedValue(new Error("Actions access denied"));
  const github = {
    rest: {
      repos: { get: vi.fn().mockResolvedValue({ data: { id: 42 } }) },
      actions: {
        getWorkflow: vi.fn().mockResolvedValue({ data: { id: 7 } }),
        getWorkflowRun,
      },
      issues: { listForRepo: vi.fn() },
    },
    paginate: {
      async *iterator() {
        for (const data of pages) yield { data };
      },
    },
  };
  await runInNewContext(`(async () => {\n${inspectionScript}\n})()`, {
    github,
    context: {
      repo: { owner: "octo", repo: "shop" },
      eventName,
      payload: { inputs: { run_id: rawId }, workflow_run: { id: rawId } },
    },
    core: {
      setOutput: (name: string, value: string) => { outputs[name] = value; },
      notice: (message: string) => { notices.push(message); },
    },
  });
  return { outputs, notices, getWorkflowRun };
}

describe("bounded QA workflow", () => {
  it("listens to the actual CI workflow and also supports manual replay", () => {
    const ci = z.object({ name: z.string() }).parse(
      parse(readFileSync(".github/workflows/ci.yml", "utf8")),
    );
    expect(workflow.on.workflow_run.workflows).toEqual([ci.name]);
    expect(workflow.on.workflow_run.branches).toEqual(["main"]);
    expect(workflow.on.workflow_run.conclusion).toBe("failure");
    expect(workflow.on.workflow_dispatch.inputs.run_id.required).toBe(true);
    expect(workflow.concurrency.group).toContain("github.event.workflow_run.id || inputs.run_id");
    expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  });

  it("keeps agent repository access read-only and allows only one issue output", () => {
    expect(workflow.checkout).toBe(false);
    expect(workflow.permissions).toEqual({
      actions: "read", contents: "read", issues: "read", "copilot-requests": "write",
    });
    expect(Object.values(workflow.jobs.inspect_ci.permissions)).toEqual(["read", "read", "read"]);
    expect(workflow["safe-outputs"]["create-issue"]).toEqual({
      max: 1,
      "title-prefix": "[QA run ${{ needs.inspect_ci.outputs.run_id }}] ",
      "deduplicate-by-title": true,
    });
    expect(workflow["safe-outputs"]["report-failure-as-issue"]).toBe(false);
    expect(workflow["safe-outputs"]["report-failed-jobs"]).toBe(false);
    expect(workflow["safe-outputs"]["report-missing-tool"]["create-issue"]).toBe(false);
    expect(workflow["safe-outputs"]["report-missing-data"]["create-issue"]).toBe(false);
    expect(workflow["safe-outputs"]["report-incomplete"]["create-issue"]).toBe(false);
    expect(workflow["safe-outputs"].noop["report-as-issue"]).toBe(false);
    for (const job of [workflow.jobs.agent, workflow.jobs.safe_outputs]) {
      expect(job.needs).toContain("inspect_ci");
      expect(job.if).toBe("needs.inspect_ci.outputs.triage == 'true'");
    }
    expect(source).not.toContain("pull_request_target:");
    expect(source).toContain("regression-test suggestions");
    expect(source).toContain("untrusted evidence");
  });

  it.each(["workflow_dispatch", "workflow_run"])("admits a validated failed run from %s", async (eventName) => {
    const { outputs, getWorkflowRun } = await inspect({ eventName });
    expect(outputs).toEqual({
      triage: "true",
      run_id: "123",
      run_url: "https://github.com/octo/shop/actions/runs/123",
      head_sha: "a".repeat(40),
    });
    expect(getWorkflowRun).toHaveBeenCalledWith({ owner: "octo", repo: "shop", run_id: 123 });
  });

  it.each(["", "0", "-1", "00123", "1.5", "1;echo secret", "9007199254740992"])(
    "rejects invalid run ID %s",
    async (rawId) => {
      await expect(inspect({ rawId })).rejects.toThrow("positive, safe integer");
    },
  );

  it.each([
    { repository: { id: 99 } },
    { head_repository: { id: 99 } },
    { head_repository: null },
    { workflow_id: 99 },
  ])("rejects foreign repositories, PR heads, and unrelated workflows", async (run) => {
    await expect(inspect({ run })).rejects.toThrow("whose head belongs to this repository");
  });

  it("rejects unfinished runs and invalid commit evidence", async () => {
    await expect(inspect({ run: { status: "in_progress" } })).rejects.toThrow("not completed");
    await expect(inspect({ run: { head_sha: "" } })).rejects.toThrow("valid tested commit");
    await expect(inspect({ failLookup: true })).rejects.toThrow("Actions access denied");
  });

  it.each(["success", "cancelled", "skipped", "timed_out", null])(
    "does not invoke the agent for conclusion %s",
    async (conclusion) => {
      expect((await inspect({ run: { conclusion } })).outputs.triage).toBe("false");
    },
  );

  it("does not report a run again, including a closed issue on a later page", async () => {
    const { outputs, notices } = await inspect({
      pages: [
        [{ title: "[QA run 456] Application CI failure", html_url: "unrelated" }],
        [{ title: "[QA run 123] Application CI failure", html_url: "https://github.com/octo/shop/issues/9" }],
      ],
    });
    expect(outputs.triage).toBe("false");
    expect(notices).toEqual(["Already reported: https://github.com/octo/shop/issues/9"]);
  });

  it("does not confuse a similarly named PR with an existing triage issue", async () => {
    const { outputs } = await inspect({
      pages: [[{ title: "[QA run 123] A PR", html_url: "pull/9", pull_request: {} }]],
    });
    expect(outputs.triage).toBe("true");
  });

  it.each(["failed-test-explainer", "issue-clarifier"])(
    "%s uses the pinned GA compiler without hand-written locks",
    (name) => {
      const lock = readFileSync(`.github/workflows/${name}.lock.yml`, "utf8");
      expect(lock).toContain('"compiler_version":"v1.0.1"');
      expect(lock).toContain("automatically generated by gh-aw (v1.0.1)");
      for (const setting of [
        "GH_AW_MISSING_TOOL_CREATE_ISSUE",
        "GH_AW_REPORT_INCOMPLETE_CREATE_ISSUE",
        "GH_AW_FAILURE_REPORT_AS_ISSUE",
        "GH_AW_REPORT_FAILED_JOBS",
        "GH_AW_NOOP_REPORT_AS_ISSUE",
      ]) {
        expect(lock).not.toContain(`${setting}: "true"`);
      }
      const compiled = z.object({
        jobs: z.record(z.string(), z.object({
          permissions: z.record(z.string(), z.string()).optional(),
        })),
      }).parse(parse(lock));
      const issueWriters = Object.entries(compiled.jobs)
        .filter(([, job]) => job.permissions?.issues === "write")
        .map(([name]) => name);
      expect(issueWriters).toContain("safe_outputs");
      // v1.0.1 also grants the reporting job write scope; its publishers are disabled above.
      expect(issueWriters.every((name) => ["conclusion", "safe_outputs"].includes(name))).toBe(true);
      expect(compiled.jobs.agent?.permissions?.issues).toBe("read");
    },
  );
});
