import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "./process.js";
import { scoreArtifact } from "./scorer.js";
import { TOOL_SPECS } from "./tools.js";
import {
  AgentDriver,
  Arm,
  ARM_NAMES,
  ArmSummary,
  DriverResult,
  RunResult,
  Task,
  ToolContext,
  ToolSpec,
  Workspace,
} from "./types.js";

const CLI = path.resolve(process.cwd(), "dist/src/cli.js");
const DEFAULT_TIMEOUT_MS = 180_000;

async function execShell(
  command: string,
  workspace: Workspace,
  signal?: AbortSignal
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lisp-editor-eval-"));
  try {
    const file = path.join(dir, "program.rkt");
    await writeFile(file, workspace.source, "utf8");
    const result = await runProcess("bash", ["-c", command], {
      cwd: dir,
      signal,
    });
    workspace.source = await readFile(file, "utf8");
    return JSON.stringify({
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function buildToolContext(
  workspace: Workspace,
  signal?: AbortSignal
): ToolContext {
  return {
    async exec(name, input) {
      if (name === "lisp_editor") {
        const args = (input as { args?: unknown }).args;
        if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) {
          return JSON.stringify({ ok: false, error: "args must be strings" });
        }
        const result = await runProcess(
          process.execPath,
          [CLI, ...(args as string[])],
          { input: workspace.source, signal }
        );
        if (result.code !== 0) {
          return JSON.stringify({ ok: false, error: result.stderr.trim() });
        }
        if (args[0] === "replace") {
          workspace.source = result.stdout;
          return JSON.stringify({ ok: true, source: result.stdout });
        }
        return JSON.stringify({ ok: true, output: result.stdout });
      }
      if (name === "shell") {
        const command = (input as { command?: unknown }).command;
        if (typeof command !== "string") {
          return JSON.stringify({ ok: false, error: "command must be a string" });
        }
        return execShell(command, workspace, signal);
      }
      return JSON.stringify({ ok: false, error: `unknown tool: ${name}` });
    },
  };
}

export interface RunMeta {
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

export async function runOne(
  driver: AgentDriver,
  arm: Arm,
  task: Task,
  meta: RunMeta = {}
): Promise<RunResult> {
  const workspace: Workspace = { source: task.input };
  const timeoutMs = meta.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const ctx = buildToolContext(workspace, controller.signal);
  const tools: ToolSpec[] = arm.tools.map((name) => {
    const spec = TOOL_SPECS[name];
    if (!spec) throw new Error(`unknown tool spec: ${name}`);
    return spec;
  });

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let result: DriverResult | undefined;
  try {
    const runPromise = driver.run({
      arm,
      task,
      tools,
      ctx,
      signal: controller.signal,
    });
    runPromise.catch(() => {});
    const abortPromise = new Promise<undefined>((resolve) => {
      if (controller.signal.aborted) resolve(undefined);
      else
        controller.signal.addEventListener("abort", () => resolve(undefined), {
          once: true,
        });
    });
    try {
      result = await Promise.race([runPromise, abortPromise]);
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      result = undefined;
    }
  } finally {
    clearTimeout(timer);
  }

  if (result === undefined) {
    return {
      taskId: task.id,
      arm: arm.name,
      model: meta.model,
      temperature: meta.temperature,
      parsed: false,
      parenMismatch: false,
      evaluates: false,
      success: false,
      parseError: `run timed out after ${timeoutMs}ms`,
      steps: 0,
      tokens: 0,
      finalArtifact: workspace.source,
      transcript: [],
    };
  }

  const finalArtifact =
    arm.tools.length === 0
      ? result.finalArtifact ?? workspace.source
      : workspace.source;
  const score = await scoreArtifact(finalArtifact, task.expected);

  return {
    taskId: task.id,
    arm: arm.name,
    model: meta.model,
    temperature: meta.temperature,
    parsed: score.parsed,
    parenMismatch: score.parenMismatch,
    evaluates: score.evaluates,
    success: score.success,
    parseError: score.error,
    steps: result.steps,
    tokens: result.tokens,
    finalArtifact,
    transcript: result.transcript,
  };
}

export async function loadJsonDir<T>(
  dir: string,
  include: (name: string) => boolean = () => true
): Promise<T[]> {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".json") && include(name))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const text = await readFile(path.join(dir, name), "utf8");
      return JSON.parse(text) as T;
    })
  );
}

export function loadTasks(
  dir = path.resolve(process.cwd(), "eval/tasks")
): Promise<Task[]> {
  return loadJsonDir<Task>(dir);
}

export function loadArms(
  dir = path.resolve(process.cwd(), "eval/arms")
): Promise<Arm[]> {
  return loadJsonDir<Arm>(dir);
}

export function summarize(results: RunResult[]): ArmSummary[] {
  return ARM_NAMES.map((arm): ArmSummary => {
    const subset = results.filter((result) => result.arm === arm);
    const denominator = subset.length || 1;
    const mean = (select: (result: RunResult) => number): number =>
      subset.length === 0
        ? 0
        : subset.reduce((sum, result) => sum + select(result), 0) /
          subset.length;
    return {
      arm,
      runs: subset.length,
      parseErrorRate:
        subset.filter((result) => !result.parsed).length / denominator,
      parenMismatchRate:
        subset.filter((result) => result.parenMismatch).length / denominator,
      successRate:
        subset.filter((result) => result.success).length / denominator,
      meanSteps: mean((result) => result.steps),
      meanTokens: mean((result) => result.tokens),
    };
  }).filter((summary) => summary.runs > 0);
}
