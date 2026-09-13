import path from "node:path";
import { ArmName } from "./types.js";

export interface Options {
  driver: "mock" | "openai";
  arms?: ArmName[];
  tasks?: string[];
  out: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  timeoutMs: number;
  concurrency: number;
}

export const USAGE = `Usage: node dist/eval/run.js [options]

Options:
  --driver <mock|openai>  Agent driver (default: mock)
  --arm <name>            Run only this arm (repeatable)
  --task <id>             Run only this task by exact id (repeatable)
  --out <dir>             Output directory (default: eval/results)
  --model <name>          Model name (required for openai)
  --base-url <url>        API base URL (required for openai)
  --api-key <key>         API key (required for openai)
  --temperature <n>       Sampling temperature (default: 0)
  --timeout <seconds>     Per-run timeout in seconds (default: 180)
  --concurrency <n>       Max runs in flight (default: 4)
  -h, --help              Show this help
`;

export function parseArgs(argv: string[]): Options {
  const options: Options = {
    driver: "mock",
    out: path.resolve(process.cwd(), "eval/results"),
    model: "",
    baseUrl: "",
    apiKey: "",
    temperature: 0,
    timeoutMs: 180_000,
    concurrency: 4,
  };
  const arms: ArmName[] = [];
  const tasks: string[] = [];
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
      case "--task":
        tasks.push(value());
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
      case "--timeout": {
        const seconds = Number(value());
        if (!Number.isFinite(seconds) || seconds <= 0) {
          throw new Error(`invalid --timeout: expected positive seconds`);
        }
        options.timeoutMs = seconds * 1000;
        break;
      }
      case "--concurrency": {
        const width = Number(value());
        if (!Number.isInteger(width) || width <= 0) {
          throw new Error(
            `invalid --concurrency: expected a positive integer`
          );
        }
        options.concurrency = width;
        break;
      }
      default:
        throw new Error(`unknown option: ${arg}\n\n${USAGE}`);
    }
  }
  if (arms.length > 0) options.arms = arms;
  if (tasks.length > 0) options.tasks = tasks;
  return options;
}
