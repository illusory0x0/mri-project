import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MockDriver } from "./drivers/mock.js";
import { OpenAICompatibleDriver } from "./drivers/openai.js";
import { Options, parseArgs, USAGE } from "./options.js";
import {
  loadArms,
  loadTasks,
  mapLimit,
  runOne,
  selectTasks,
  summarizeBracketDanger,
  summarizeHeadline,
} from "./runner.js";
import { AgentDriver } from "./types.js";

function makeDriver(options: Options): AgentDriver {
  if (options.driver === "mock") return new MockDriver();
  if (!options.baseUrl || !options.apiKey || !options.model) {
    throw new Error(
      "openai driver requires --base-url, --api-key, and --model"
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
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return;
  }
  const options = parseArgs(argv);
  const driver = makeDriver(options);
  const allArms = await loadArms();
  const arms = options.arms
    ? allArms.filter((arm) => options.arms!.includes(arm.name))
    : allArms;
  const tasks = selectTasks(await loadTasks(), options.tasks);

  await mkdir(options.out, { recursive: true });

  const jobs = arms.flatMap((arm) => tasks.map((task) => ({ arm, task })));
  const results = await mapLimit(
    jobs,
    options.concurrency,
    async ({ arm, task }) => {
      const result = await runOne(driver, arm, task, {
        model: options.model || undefined,
        temperature: options.temperature,
        timeoutMs: options.timeoutMs,
      });
      const name = `${arm.name}-${task.id}.json`;
      await writeFile(
        path.join(options.out, name),
        JSON.stringify(result, null, 2)
      );
      process.stdout.write(
        `${arm.name} ${task.id} success=${result.success} parsed=${result.parsed}\n`
      );
      return result;
    }
  );

  await writeFile(
    path.join(options.out, "summary.json"),
    JSON.stringify(
      {
        arms: summarizeHeadline(results, tasks),
        bracketDanger: summarizeBracketDanger(results, tasks),
      },
      null,
      2
    )
  );
  process.stdout.write(`\nwrote ${results.length} runs to ${options.out}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
