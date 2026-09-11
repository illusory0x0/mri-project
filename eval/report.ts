import path from "node:path";
import { loadJsonDir, summarize } from "./runner.js";
import { RunResult } from "./types.js";

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fixed(value: number): string {
  return value.toFixed(1);
}

function rate(results: RunResult[]): number {
  return results.length === 0
    ? 0
    : results.filter((result) => result.success).length / results.length;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let dir = path.resolve(process.cwd(), "eval/results");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--results") {
      const value = argv[++i];
      if (value === undefined) throw new Error("missing value for --results");
      dir = path.resolve(value);
    } else {
      throw new Error(`unknown option: ${argv[i]}`);
    }
  }

  const results = await loadJsonDir<RunResult>(
    dir,
    (name) => name !== "summary.json"
  );
  const summaries = summarize(results);
  const arms = summaries.map((summary) => summary.arm);
  const taskIds = [...new Set(results.map((result) => result.taskId))].sort();

  const models = [...new Set(results.map((result) => result.model ?? "mock"))];
  const temperatures = [
    ...new Set(results.map((result) => String(result.temperature ?? "default"))),
  ];
  const seeds = [...new Set(results.map((result) => result.seed))].sort(
    (a, b) => a - b
  );

  process.stdout.write(
    "Note: the editor arm is expected to have near-zero bracket mismatches by\n" +
      "construction, so success@1, steps, and tokens carry the real signal.\n\n"
  );
  process.stdout.write(
    `conditions: model=${models.join(", ")} temperature=${temperatures.join(
      ", "
    )} seeds=[${seeds.join(", ")}] tasks=${taskIds.length} runs=${results.length}\n`
  );
  if (models.includes("mock")) {
    process.stdout.write(
      "model=mock means synthetic MockDriver results, not real agent behaviour\n"
    );
  }
  process.stdout.write("\n");

  const widths = [10, 6, 11, 16, 11, 8, 8];
  const headers = [
    "arm",
    "runs",
    "parse-err",
    "paren-mismatch",
    "success@1",
    "steps",
    "tokens",
  ];
  process.stdout.write(
    headers.map((header, index) => header.padEnd(widths[index])).join(" ") + "\n"
  );
  for (const summary of summaries) {
    process.stdout.write(
      [
        summary.arm.padEnd(widths[0]),
        String(summary.runs).padEnd(widths[1]),
        percent(summary.parseErrorRate).padEnd(widths[2]),
        percent(summary.parenMismatchRate).padEnd(widths[3]),
        percent(summary.successRate).padEnd(widths[4]),
        fixed(summary.meanSteps).padEnd(widths[5]),
        fixed(summary.meanTokens).padEnd(widths[6]),
      ].join(" ") + "\n"
    );
  }

  process.stdout.write("\nper-task success@1:\n");
  process.stdout.write(
    ["task", ...arms].map((cell, index) => cell.padEnd(index === 0 ? 18 : 9)).join(" ") +
      "\n"
  );
  for (const taskId of taskIds) {
    const cells = arms.map((arm) =>
      percent(
        rate(
          results.filter(
            (result) => result.taskId === taskId && result.arm === arm
          )
        )
      ).padEnd(9)
    );
    process.stdout.write(taskId.padEnd(18) + " " + cells.join(" ") + "\n");
  }

  process.stdout.write(`\nfrom ${results.length} runs in ${dir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
