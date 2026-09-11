#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { clone } from "./ast.js";
import { expandShape, OpsError, outline, parsePath, replaceAt, resolve } from "./ops.js";
import { parse } from "./parser.js";
import { printProgram } from "./printer.js";

const USAGE = `Usage:
  lisp-editor outline [--file <path>]
  lisp-editor replace <shape> --out <astpath> [--file <path>]
  lisp-editor replace --in <astpath> --out <astpath> [--file <path>]`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readInput(file: string | undefined): Promise<string> {
  if (file !== undefined) return readFile(file, "utf8");
  return readStdin();
}

interface ParsedArgs {
  file?: string;
  inPath?: string;
  outPath?: string;
  positionals: string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positionals: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" || arg === "--in" || arg === "--out") {
      const value = args[++i];
      if (value === undefined) throw new OpsError(`missing value for ${arg}`);
      if (arg === "--file") parsed.file = value;
      else if (arg === "--in") parsed.inPath = value;
      else parsed.outPath = value;
    } else if (arg.startsWith("--")) {
      throw new OpsError(`unknown option: ${arg}`);
    } else {
      parsed.positionals.push(arg);
    }
  }
  return parsed;
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(USAGE + "\n");
    return command === undefined ? 1 : 0;
  }

  try {
    if (command === "outline") {
      const args = parseArgs(argv.slice(1));
      if (args.positionals.length > 0) {
        throw new OpsError("outline takes no positional arguments");
      }
      if (args.inPath !== undefined || args.outPath !== undefined) {
        throw new OpsError("outline takes no --in/--out");
      }
      const root = parse(await readInput(args.file));
      process.stdout.write(JSON.stringify(outline(root)) + "\n");
      return 0;
    }

    if (command === "replace") {
      const args = parseArgs(argv.slice(1));
      if (args.outPath === undefined) {
        throw new OpsError("replace requires --out <astpath>");
      }
      const root = parse(await readInput(args.file));

      let next: ReturnType<typeof expandShape>;
      if (args.inPath !== undefined) {
        if (args.positionals.length > 0) {
          throw new OpsError("cannot combine --in with a shape");
        }
        next = clone(resolve(root, parsePath(args.inPath)));
      } else {
        if (args.positionals.length !== 1) {
          throw new OpsError("replace requires exactly one shape, or --in");
        }
        next = expandShape(args.positionals[0]);
      }

      const result = replaceAt(root, parsePath(args.outPath), next);
      process.stdout.write(printProgram(result) + "\n");
      return 0;
    }

    throw new OpsError(`unknown command: ${command}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`lisp-editor: ${message}\n`);
    return 1;
  }
}

main().then((code) => {
  process.exitCode = code;
});
