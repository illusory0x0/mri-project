#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { clone } from "./ast.js";
import {
  deleteAt,
  expandShape,
  insertAt,
  OpsError,
  outline,
  parsePath,
  replaceAt,
  resolve,
} from "./ops.js";
import { parse } from "./parser.js";
import { printProgram } from "./printer.js";

const USAGE = `Usage:
  lisp-editor outline [--file <path>]
  lisp-editor replace <shape> --out <astpath> [--file <path>]
  lisp-editor replace --in <astpath> --out <astpath> [--file <path>]
  lisp-editor delete --out <astpath> [--file <path>]
  lisp-editor insert <shape> --into <astpath> --at <index> [--file <path>]
  lisp-editor insert --in <astpath> --into <astpath> --at <index> [--file <path>]`;

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
  intoPath?: string;
  at?: string;
  positionals: string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positionals: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (
      arg === "--file" ||
      arg === "--in" ||
      arg === "--out" ||
      arg === "--into" ||
      arg === "--at"
    ) {
      const value = args[++i];
      if (value === undefined) throw new OpsError(`missing value for ${arg}`);
      if (arg === "--file") parsed.file = value;
      else if (arg === "--in") parsed.inPath = value;
      else if (arg === "--out") parsed.outPath = value;
      else if (arg === "--into") parsed.intoPath = value;
      else parsed.at = value;
    } else if (arg.startsWith("--")) {
      throw new OpsError(`unknown option: ${arg}`);
    } else {
      parsed.positionals.push(arg);
    }
  }
  return parsed;
}

function parseIndex(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new OpsError(`invalid index: ${JSON.stringify(raw)}`);
  }
  return Number(raw);
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
      if (
        args.inPath !== undefined ||
        args.outPath !== undefined ||
        args.intoPath !== undefined ||
        args.at !== undefined
      ) {
        throw new OpsError("outline takes no --in/--out/--into/--at");
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
      if (args.intoPath !== undefined || args.at !== undefined) {
        throw new OpsError("replace takes no --into/--at");
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

    if (command === "delete") {
      const args = parseArgs(argv.slice(1));
      if (args.outPath === undefined) {
        throw new OpsError("delete requires --out <astpath>");
      }
      if (
        args.inPath !== undefined ||
        args.intoPath !== undefined ||
        args.at !== undefined ||
        args.positionals.length > 0
      ) {
        throw new OpsError("delete takes only --out");
      }
      const root = parse(await readInput(args.file));
      const result = deleteAt(root, parsePath(args.outPath));
      process.stdout.write(printProgram(result) + "\n");
      return 0;
    }

    if (command === "insert") {
      const args = parseArgs(argv.slice(1));
      if (args.intoPath === undefined) {
        throw new OpsError("insert requires --into <astpath>");
      }
      if (args.at === undefined) {
        throw new OpsError("insert requires --at <index>");
      }
      if (args.outPath !== undefined) {
        throw new OpsError("insert takes no --out");
      }
      const index = parseIndex(args.at);
      const root = parse(await readInput(args.file));

      let next: ReturnType<typeof expandShape>;
      if (args.inPath !== undefined) {
        if (args.positionals.length > 0) {
          throw new OpsError("cannot combine --in with a shape");
        }
        next = clone(resolve(root, parsePath(args.inPath)));
      } else {
        if (args.positionals.length !== 1) {
          throw new OpsError("insert requires exactly one shape, or --in");
        }
        next = expandShape(args.positionals[0]);
      }

      const result = insertAt(root, parsePath(args.intoPath), index, next);
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
