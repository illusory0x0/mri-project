import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MockDriver } from "./drivers/mock.js";
import { OpenAICompatibleDriver } from "./drivers/openai.js";
import { loadArms, loadTasks, runOne, summarize } from "./runner.js";
import { AgentDriver, ArmName, RunResult } from "./types.js";

interface Options {
  driver: "mock" | "openai";
  arms?: ArmName[];
  seed: number;
  seeds: number;
  out: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    driver: "mock",
    seed: 0,
    seeds: 1,
    out: path.resolve(process.cwd(), "eval/results"),
    model: process.env.LISP_EDITOR_MODEL ?? "",
    baseUrl: process.env.LISP_EDITOR_BASE_URL ?? "",
    apiKey: process.env.LISP_EDITOR_API_KEY ?? "",
    temperature: Number(process.env.LISP_EDITOR_TEMPERATURE ?? "0"),
    timeoutMs: Number(process.env.LISP_EDITOR_RUN_TIMEOUT_MS ?? "180000"),
  };
  const arms: ArmName[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) throw new Error(`missing value for ${arg}`);
      return next;
    };
    switch (arg) {
      case "--driver":
        options.driver = value() as Options["driver"];
        break;
      case "--arm":
        arms.push(value() as ArmName);
        break;
      case "--seed":
        options.seed = Number(value());
        break;
      case "--seeds":
        options.seeds = Number(value());
        break;
      case "--out":
        options.out = path.resolve(value());
        break;
      case "--model":
        options.model = value();
        break;
      case "--base-url":
        options.baseUrl = value();
        break;
      case "--api-key":
        options.apiKey = value();
        break;
      case "--temperature":
        options.temperature = Number(value());
        break;
      case "--timeout":
        options.timeoutMs = Number(value());
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }
  if (arms.length > 0) options.arms = arms;
  return options;
}

function makeDriver(options: Options): AgentDriver {
  if (options.driver === "mock") return new MockDriver();
  if (!options.baseUrl || !options.apiKey || !options.model) {
    throw new Error(
      "openai driver requires --base-url, --api-key, and --model (or LISP_EDITOR_* env vars)"
    );
  }
  return new OpenAICompatibleDriver({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    model: options.model,
    temperature: options.temperature,
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const driver = makeDriver(options);
  const allArms = await loadArms();
  const arms = options.arms
    ? allArms.filter((arm) => options.arms!.includes(arm.name))
    : allArms;
  const tasks = await loadTasks();

  await mkdir(options.out, { recursive: true });
  const results: RunResult[] = [];

  for (const arm of arms) {
    for (const task of tasks) {
      for (let i = 0; i < options.seeds; i++) {
        const seed = options.seed + i;
        const result = await runOne(driver, arm, task, seed, {
          model: options.model || undefined,
          temperature: options.temperature,
          timeoutMs: options.timeoutMs,
        });
        results.push(result);
        const name = `${arm.name}-${task.id}-${seed}.json`;
        await writeFile(
          path.join(options.out, name),
          JSON.stringify(result, null, 2)
        );
        process.stdout.write(
          `${arm.name} ${task.id} seed=${seed} success=${result.success} parsed=${result.parsed}\n`
        );
      }
    }
  }

  await writeFile(
    path.join(options.out, "summary.json"),
    JSON.stringify(summarize(results), null, 2)
  );
  process.stdout.write(`\nwrote ${results.length} runs to ${options.out}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
