import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { withDepth } from "./depth.js";
import { applyPatch } from "./patch.js";
import { runProcess } from "./process.js";
import { scoreArtifact } from "./scorer.js";
import { TOOL_SPECS } from "./tools.js";
import {
  AgentDriver,
  Arm,
  ARM_NAMES,
  ArmName,
  ArmSummary,
  BracketDangerCell,
  DriverResult,
  LoadedTask,
  RunResult,
  SetSummary,
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
    const content = workspace.source.endsWith("\n")
      ? workspace.source
      : workspace.source + "\n";
    await writeFile(file, content, "utf8");
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
        if (args[0] === "replace" || args[0] === "delete" || args[0] === "insert") {
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
  timeoutMs?: number;
  repeat?: number;
}

export function resultFileName(
  arm: ArmName,
  taskId: string,
  repeats: number,
  repeat: number
): string {
  return repeats > 1
    ? `${arm}-${taskId}-r${repeat}.json`
    : `${arm}-${taskId}.json`;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  if (items.length === 0) return results;
  const width = Math.max(1, Math.min(Math.floor(limit), items.length));
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: width }, () => worker()));
  return results;
}

export async function runOne(
  driver: AgentDriver,
  arm: Arm,
  task: Task,
  meta: RunMeta = {}
): Promise<RunResult> {
  const workspace: Workspace = { source: task.input };
  const { depth } = withDepth(task);
  const repeat = meta.repeat ?? 1;
  const { model, temperature } = driver.config(arm);
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
      driver: driver.id,
      model,
      temperature,
      repeat,
      parsed: false,
      parenMismatch: false,
      hunkFailure: false,
      ioViolation: false,
      evaluates: false,
      success: false,
      structural: false,
      semantic: task.probe !== undefined ? "unknown" : null,
      depth,
      parseError: `run timed out after ${timeoutMs}ms`,
      steps: 0,
      tokens: 0,
      finalArtifact: workspace.source,
      transcript: [],
    };
  }

  let finalArtifact: string;
  if (arm.diff) {
    const diffText = result.finalArtifact ?? "";
    try {
      finalArtifact = await applyPatch(workspace.source, diffText, controller.signal);
    } catch (error) {
      return {
        taskId: task.id,
        arm: arm.name,
        driver: driver.id,
        model,
        temperature,
        parsed: false,
        parenMismatch: false,
        hunkFailure: true,
        ioViolation: false,
        evaluates: false,
        success: false,
        structural: false,
        semantic: task.probe !== undefined ? "unknown" : null,
        depth,
        parseError: `diff apply failed: ${error instanceof Error ? error.message : String(error)}`,
        steps: result.steps,
        tokens: result.tokens,
        finalArtifact: diffText,
        transcript: result.transcript,
      };
    }
  } else if (arm.tools.length === 0) {
    finalArtifact = result.finalArtifact ?? workspace.source;
  } else {
    finalArtifact = workspace.source;
  }
  const score = await scoreArtifact(finalArtifact, task.expected, task.probe);

  return {
    taskId: task.id,
    arm: arm.name,
    driver: driver.id,
    model,
    temperature,
    repeat,
    parsed: score.parsed,
    parenMismatch: score.parenMismatch,
    hunkFailure: false,
    ioViolation: score.ioViolation,
    evaluates: score.evaluates,
    success: score.success,
    structural: score.structural,
    semantic: score.semantic,
    depth,
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

async function loadTaskSet(dir: string, set: string): Promise<LoadedTask[]> {
  const tasks = await loadJsonDir<Task>(dir);
  return tasks.map((task) => withDepth(task, set));
}

export async function loadTasks(
  root = path.resolve(process.cwd(), "eval/tasks")
): Promise<LoadedTask[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const loaded: LoadedTask[] = [];

  const topLevel = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".json")
  );
  if (topLevel.length > 0) {
    loaded.push(...(await loadTaskSet(root, path.basename(root))));
  }

  const sets = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const set of sets) {
    const setDir = path.join(root, set);
    const names = (await readdir(setDir)).filter((name) =>
      name.endsWith(".json")
    );
    if (names.length === 0) continue;
    loaded.push(...(await loadTaskSet(setDir, set)));
  }
  return loaded;
}

export function loadArms(
  dir = path.resolve(process.cwd(), "eval/arms")
): Promise<Arm[]> {
  return loadJsonDir<Arm>(dir);
}

export function selectTasks(tasks: Task[], ids?: string[]): Task[] {
  if (!ids || ids.length === 0) return tasks;
  const wanted = new Set(ids);
  const known = new Set(tasks.map((task) => task.id));
  const unknown = [...wanted].filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`unknown task id(s): ${unknown.join(", ")}`);
  }
  return tasks.filter((task) => wanted.has(task.id));
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
    const withProbe = subset.filter(
      (result) => result.semantic !== null && result.semantic !== undefined
    );
    const scored = withProbe.filter((result) => result.semantic !== "unknown");
    const semanticRate =
      scored.length > 0
        ? scored.filter((result) => result.semantic === "equal").length /
          scored.length
        : 0;
    return {
      arm,
      runs: subset.length,
      parseErrorRate:
        subset.filter((result) => !result.parsed && !result.hunkFailure).length /
        denominator,
      parenMismatchRate:
        subset.filter((result) => result.parenMismatch).length / denominator,
      hunkFailureRate:
        subset.filter((result) => result.hunkFailure).length / denominator,
      successRate:
        subset.filter((result) => result.success).length / denominator,
      structuralRate:
        subset.filter((result) => result.structural).length / denominator,
      semanticRate,
      semanticScored: scored.length,
      semanticUnknown: withProbe.filter((result) => result.semantic === "unknown")
        .length,
      meanSteps: mean((result) => result.steps),
      meanTokens: mean((result) => result.tokens),
    };
  }).filter((summary) => summary.runs > 0);
}

export function summarizeBySet(runs: RunResult[], tasks: Task[]): SetSummary[] {
  const setOf = new Map(tasks.map((task) => [task.id, task.set ?? "unknown"]));
  const sets = [
    ...new Set(runs.map((run) => setOf.get(run.taskId) ?? "unknown")),
  ].sort();
  const out: SetSummary[] = [];
  for (const set of sets) {
    const subset = runs.filter(
      (run) => (setOf.get(run.taskId) ?? "unknown") === set
    );
    for (const summary of summarize(subset)) {
      out.push({ ...summary, set });
    }
  }
  return out;
}

export function bracketDangerTaskIds(tasks: Task[]): Set<string> {
  return new Set(
    tasks.filter((task) => task.bracketDanger).map((task) => task.id)
  );
}

export function summarizeBracketDanger(
  results: RunResult[],
  tasks: Task[]
): BracketDangerCell {
  const ids = bracketDangerTaskIds(tasks);
  return {
    taskIds: [...ids].sort(),
    summary: summarize(results.filter((result) => ids.has(result.taskId))),
  };
}

export function summarizeHeadline(
  results: RunResult[],
  tasks: Task[]
): ArmSummary[] {
  const danger = bracketDangerTaskIds(tasks);
  return summarize(results.filter((result) => !danger.has(result.taskId)));
}
