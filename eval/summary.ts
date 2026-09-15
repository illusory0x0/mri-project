import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSharedPaths } from "./flags.js";
import { loadJsonDir, loadTasks, summarizeBracketDanger, summarizeBySet, summarizeHeadline } from "./runner.js";
import { computeRunMetrics } from "./metrics.js";
import { modalVerdict } from "./verdict.js";
import {
  ARM_NAMES,
  ArmName,
  BatchingStat,
  CellSummary,
  CONSTRUCT_KINDS,
  ConstructKind,
  ConstructSummary,
  LocateDifficulty,
  OPERATION_KINDS,
  OperationKind,
  OperationSummary,
  RunResult,
  SetSummary,
  StabilitySummary,
  SummaryProvenance,
  SummaryRunRow,
  SummarySnapshot,
  Task,
  TaskSetRef,
} from "./types.js";

const CONSTRUCT_ORDER: readonly ConstructKind[] = CONSTRUCT_KINDS;
const OPERATION_ORDER: readonly OperationKind[] = OPERATION_KINDS;

function sha256(parts: Array<string | Buffer>): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function hashDir(
  dir: string,
  include: (name: string) => boolean
): Promise<string> {
  const names = (await readdir(dir)).filter(include).sort();
  const parts: string[] = [];
  for (const name of names) {
    parts.push(name, await readFile(path.join(dir, name), "utf8"));
  }
  return sha256(parts);
}

async function hashFiles(files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const file of files.slice().sort()) {
    parts.push(file, await readFile(file, "utf8"));
  }
  return sha256(parts);
}

function gitCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

function gitDirty(): boolean {
  try {
    const out = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=no"],
      { encoding: "utf8" }
    );
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

async function hashTaskTree(
  root: string
): Promise<{ taskSetHash: string; taskSets: TaskSetRef[] }> {
  const entries = (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const taskSets: TaskSetRef[] = [];
  const parts: Array<string | Buffer> = [];
  const flat: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const hash = await hashDir(path.join(root, entry.name), (name) =>
        name.endsWith(".json")
      );
      taskSets.push({ name: entry.name, hash });
      parts.push(entry.name, hash);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      flat.push(path.join(root, entry.name));
    }
  }
  if (flat.length > 0) {
    const name = path.basename(root);
    const hash = await hashFiles(flat);
    taskSets.unshift({ name, hash });
    parts.push(name, hash);
  }
  return { taskSetHash: sha256(parts), taskSets };
}

async function tasksRoot(dir: string): Promise<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.some((entry) => entry.isDirectory()) ? dir : path.dirname(dir);
}

export async function collectProvenance(
  runs: RunResult[],
  dirs: { arms: string; tasks: string }
): Promise<SummaryProvenance> {
  const models = [...new Set(runs.map((run) => run.model ?? "mock"))];
  const temperatures = [
    ...new Set(runs.map((run) => String(run.temperature ?? "default"))),
  ];
  const drivers = [...new Set(runs.map((run) => run.driver))];
  const tree = await hashTaskTree(await tasksRoot(dirs.tasks));
  return {
    generatedAt: new Date().toISOString(),
    gitCommit: gitCommit(),
    gitDirty: gitDirty(),
    model: models.join(","),
    temperature: temperatures.join(","),
    driver: drivers.join(","),
    taskSets: tree.taskSets,
    armHash: await hashDir(dirs.arms, (name) => name.endsWith(".json")),
    vocabHash: await hashFiles(["src/ops.ts", "eval/tools.ts"]),
    taskSetHash: tree.taskSetHash,
    scorerHash: await hashFiles(["eval/score.rkt", "eval/scorer.ts"]),
  };
}

export function computeBatching(runs: RunResult[]): BatchingStat[] {
  return ARM_NAMES.map((arm): BatchingStat => {
    const subset = runs.filter((run) => run.arm === arm);
    let assistantTurns = 0;
    let toolTurns = 0;
    let toolCalls = 0;
    for (const run of subset) {
      for (const raw of run.transcript) {
        const message = raw as { role?: string; tool_calls?: unknown[] };
        if (message?.role !== "assistant") continue;
        assistantTurns++;
        const calls = Array.isArray(message.tool_calls)
          ? message.tool_calls.length
          : 0;
        if (calls > 0) {
          toolTurns++;
          toolCalls += calls;
        }
      }
    }
    return {
      arm,
      assistantTurns,
      toolTurns,
      toolCalls,
      commandsPerTurn: toolTurns === 0 ? 0 : toolCalls / toolTurns,
    };
  }).filter((stat) => stat.assistantTurns > 0);
}

function summarizeConstruct(
  arm: ArmName,
  set: string,
  construct: ConstructKind,
  results: RunResult[]
): ConstructSummary {
  return { arm, set, construct, ...computeRunMetrics(results) };
}

function summarizeOperation(
  arm: ArmName,
  set: string,
  operation: OperationKind,
  results: RunResult[]
): OperationSummary {
  return { arm, set, operation, ...computeRunMetrics(results) };
}

export function computeStability(
  runs: RunResult[],
  tasks: Task[]
): StabilitySummary[] {
  const setOf = new Map(tasks.map((task) => [task.id, task.set ?? "unknown"]));
  const groups = new Map<
    string,
    { taskId: string; arm: ArmName; runs: RunResult[] }
  >();
  for (const run of runs) {
    const key = `${run.taskId}\u0000${run.arm}\u0000${run.driver}`;
    const entry = groups.get(key);
    if (entry) entry.runs.push(run);
    else
      groups.set(key, {
        taskId: run.taskId,
        arm: run.arm,
        runs: [run],
      });
  }
  const acc = new Map<
    string,
    { set: string; arm: ArmName; total: number; count: number }
  >();
  for (const entry of groups.values()) {
    const set = setOf.get(entry.taskId) ?? "unknown";
    const modal = modalVerdict(entry.runs);
    const agreement = modal.total === 0 ? 0 : modal.n / modal.total;
    const groupKey = `${set}\u0000${entry.arm}`;
    const agg = acc.get(groupKey) ?? { set, arm: entry.arm, total: 0, count: 0 };
    agg.total += agreement;
    agg.count += 1;
    acc.set(groupKey, agg);
  }
  return [...acc.values()]
    .map((entry) => ({
      set: entry.set,
      arm: entry.arm,
      tasks: entry.count,
      meanAgreement: entry.count === 0 ? 0 : entry.total / entry.count,
    }))
    .sort(
      (a, b) => a.set.localeCompare(b.set) || a.arm.localeCompare(b.arm)
    );
}

function runRows(
  runs: RunResult[],
  tasksById: Map<string, Task>
): SummaryRunRow[] {
  return runs
    .map((run): SummaryRunRow => {
      const task = tasksById.get(run.taskId);
      return {
        taskId: run.taskId,
        arm: run.arm,
        set: task?.set ?? "unknown",
        construct: task?.construct ?? null,
        operation: task?.operation ?? null,
        locate: task?.locate ?? "explicit",
        success: run.success,
        structural: run.structural,
        semantic: run.semantic,
        parenMismatch: run.parenMismatch,
        hunkFailure: run.hunkFailure,
        ioViolation: run.ioViolation,
        steps: run.steps,
        tokens: run.tokens,
      };
    })
    .sort((a, b) => a.taskId.localeCompare(b.taskId) || a.arm.localeCompare(b.arm));
}

export function buildSnapshot(
  runs: RunResult[],
  tasks: Task[],
  provenance: SummaryProvenance
): SummarySnapshot {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const perConstruct: ConstructSummary[] = [];
  const perOperation: OperationSummary[] = [];
  const cells: CellSummary[] = [];
  const LOCATES: LocateDifficulty[] = ["explicit", "described"];
  const sets = [...new Set(tasks.map((task) => task.set ?? "unknown"))].sort();
  for (const set of sets) {
    for (const arm of ARM_NAMES) {
      const inSet = (run: RunResult): boolean =>
        run.arm === arm &&
        (tasksById.get(run.taskId)?.set ?? "unknown") === set;
      for (const construct of CONSTRUCT_ORDER) {
        const results = runs.filter(
          (run) =>
            inSet(run) && tasksById.get(run.taskId)?.construct === construct
        );
        if (results.length > 0) {
          perConstruct.push(summarizeConstruct(arm, set, construct, results));
        }
        for (const locate of LOCATES) {
          const cellRuns = results.filter(
            (run) =>
              (tasksById.get(run.taskId)?.locate ?? "explicit") === locate
          );
          if (cellRuns.length > 0) {
            cells.push({
              ...summarizeConstruct(arm, set, construct, cellRuns),
              locate,
            });
          }
        }
      }
      for (const operation of OPERATION_ORDER) {
        const results = runs.filter(
          (run) =>
            inSet(run) && tasksById.get(run.taskId)?.operation === operation
        );
        if (results.length > 0) {
          perOperation.push(summarizeOperation(arm, set, operation, results));
        }
      }
    }
  }

  return {
    provenance,
    headline: summarizeHeadline(runs, tasks),
    perSet: summarizeBySet(runs, tasks),
    bracketDanger: summarizeBracketDanger(runs, tasks),
    perConstruct,
    perOperation,
    cells,
    stability: computeStability(runs, tasks),
    batching: computeBatching(runs),
    runs: runRows(runs, tasksById),
  };
}

function modelSlug(model: string): string {
  return model.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

const USAGE = `Usage: node dist/eval/summary.js [options]

Options:
  --results <dir>  Results directory (default: eval/results)
  --tasks <dir>    Tasks directory (default: eval/tasks)
  --arms <dir>     Arms directory (default: eval/arms)
  --out <dir>      Snapshot output directory (default: eval/summaries)
  -h, --help       Show this help
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return;
  }
  const { paths, rest } = parseSharedPaths(argv, {
    cwd: process.cwd(),
    outDefault: "eval/summaries",
  });
  if (rest.length > 0) {
    throw new Error(`unknown option: ${rest[0]}\n\n${USAGE}`);
  }
  const { resultsDir, tasksDir, armsDir, outDir } = paths;

  const runs = await loadJsonDir<RunResult>(resultsDir);
  if (runs.length === 0) {
    throw new Error(`no runs found in ${resultsDir}`);
  }
  const tasks = await loadTasks(tasksDir);
  const provenance = await collectProvenance(runs, {
    arms: armsDir,
    tasks: tasksDir,
  });
  const setOf = new Map(tasks.map((task) => [task.id, task.set ?? "unknown"]));
  const presentSets = new Set(
    runs.map((run) => setOf.get(run.taskId) ?? "unknown")
  );
  provenance.taskSets = provenance.taskSets.filter((set) =>
    presentSets.has(set.name)
  );
  const snapshot = buildSnapshot(runs, tasks, provenance);

  const date = provenance.generatedAt.slice(0, 10);
  const name =
    `${date}-${modelSlug(provenance.model)}` +
    `-${provenance.armHash.slice(0, 8)}` +
    `-${provenance.taskSetHash.slice(0, 8)}.json`;
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, name);
  await writeFile(outFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  process.stdout.write(
    `wrote ${outFile} (${runs.length} runs, task sets ` +
      `${provenance.taskSets.map((set) => set.name).join("+") || "none"}, ` +
      `${snapshot.perConstruct.length} constructs, ${snapshot.perOperation.length} operations)\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
