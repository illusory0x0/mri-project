import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadJsonDir,
  loadTasks,
  summarizeBracketDanger,
  summarizeHeadline,
} from "./runner.js";
import {
  ArmName,
  BatchingStat,
  CellSummary,
  ConstructKind,
  ConstructSummary,
  LocateDifficulty,
  RunResult,
  SummaryProvenance,
  SummaryRunRow,
  SummarySnapshot,
  Task,
} from "./types.js";

const ARM_ORDER: ArmName[] = ["direct", "ast-edit", "text-edit", "diff"];
const CONSTRUCT_ORDER: ConstructKind[] = [
  "atom",
  "wrap",
  "build",
  "copy",
  "multi",
];

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

export async function collectProvenance(
  runs: RunResult[],
  dirs: { arms: string; tasks: string }
): Promise<SummaryProvenance> {
  const models = [...new Set(runs.map((run) => run.model ?? "mock"))];
  const temperatures = [
    ...new Set(runs.map((run) => String(run.temperature ?? "default"))),
  ];
  const drivers = [...new Set(runs.map((run) => run.driver))];
  return {
    generatedAt: new Date().toISOString(),
    gitCommit: gitCommit(),
    gitDirty: gitDirty(),
    model: models.join(","),
    temperature: temperatures.join(","),
    driver: drivers.join(","),
    armHash: await hashDir(dirs.arms, (name) => name.endsWith(".json")),
    vocabHash: await hashFiles(["src/ops.ts", "eval/tools.ts"]),
    taskSetHash: await hashDir(dirs.tasks, (name) => name.endsWith(".json")),
    scorerHash: await hashFiles(["eval/score.rkt", "eval/scorer.ts"]),
  };
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeBatching(runs: RunResult[]): BatchingStat[] {
  return ARM_ORDER.map((arm): BatchingStat => {
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
  construct: ConstructKind,
  results: RunResult[]
): ConstructSummary {
  const scored = results.filter(
    (result) => result.semantic !== null && result.semantic !== "unknown"
  );
  return {
    arm,
    construct,
    runs: results.length,
    successRate: mean(results.map((result) => (result.success ? 1 : 0))),
    structuralRate: mean(results.map((result) => (result.structural ? 1 : 0))),
    semanticRate:
      scored.length === 0
        ? 0
        : mean(scored.map((result) => (result.semantic === "equal" ? 1 : 0))),
    semanticScored: scored.length,
    meanSteps: mean(results.map((result) => result.steps)),
    meanTokens: mean(results.map((result) => result.tokens)),
    totalTokens: results.reduce((sum, result) => sum + result.tokens, 0),
  };
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
        construct: task?.construct ?? "atom",
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
  const cells: CellSummary[] = [];
  const LOCATES: LocateDifficulty[] = ["explicit", "described"];
  for (const arm of ARM_ORDER) {
    for (const construct of CONSTRUCT_ORDER) {
      const results = runs.filter(
        (run) =>
          run.arm === arm &&
          (tasksById.get(run.taskId)?.construct ?? "atom") === construct
      );
      if (results.length > 0) {
        perConstruct.push(summarizeConstruct(arm, construct, results));
      }
      for (const locate of LOCATES) {
        const cellRuns = results.filter(
          (run) => (tasksById.get(run.taskId)?.locate ?? "explicit") === locate
        );
        if (cellRuns.length > 0) {
          cells.push({
            ...summarizeConstruct(arm, construct, cellRuns),
            locate,
          });
        }
      }
    }
  }

  return {
    provenance,
    headline: summarizeHeadline(runs, tasks),
    bracketDanger: summarizeBracketDanger(runs, tasks),
    perConstruct,
    cells,
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
  const cwd = process.cwd();
  let resultsDir = path.resolve(cwd, "eval/results");
  let tasksDir = path.resolve(cwd, "eval/tasks");
  let armsDir = path.resolve(cwd, "eval/arms");
  let outDir = path.resolve(cwd, "eval/summaries");
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (
      flag === "--results" ||
      flag === "--tasks" ||
      flag === "--arms" ||
      flag === "--out"
    ) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for ${flag}`);
      if (flag === "--results") resultsDir = path.resolve(value);
      if (flag === "--tasks") tasksDir = path.resolve(value);
      if (flag === "--arms") armsDir = path.resolve(value);
      if (flag === "--out") outDir = path.resolve(value);
    } else {
      throw new Error(`unknown option: ${flag}\n\n${USAGE}`);
    }
  }

  const runs = await loadJsonDir<RunResult>(
    resultsDir,
    (name) => name !== "summary.json"
  );
  if (runs.length === 0) {
    throw new Error(`no runs found in ${resultsDir}`);
  }
  const tasks = await loadTasks(tasksDir);
  const provenance = await collectProvenance(runs, {
    arms: armsDir,
    tasks: tasksDir,
  });
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
    `wrote ${outFile} (${runs.length} runs, ${snapshot.perConstruct.length} constructs)\n`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
