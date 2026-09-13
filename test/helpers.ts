import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const CLI = path.resolve(process.cwd(), "dist/src/cli.js");

export interface Result {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function run(input: string, args: string[]): Result {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    input,
    encoding: "utf8",
  });
  return { stdout: result.stdout, stderr: result.stderr, code: result.status };
}

export function ok(input: string, args: string[]): string {
  const result = run(input, args);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout;
}

export interface ListEntry {
  path: number[];
  kind: "list";
  head: string | null;
}

export interface AtomEntry {
  path: number[];
  kind: "symbol" | "number" | "string" | "hole";
  value: string;
}

export type Entry = ListEntry | AtomEntry;

export function outline(input: string): Entry[] {
  const result = run(input, ["outline"]);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout) as Entry[];
}

export function find(entries: Entry[], path: number[]): Entry | undefined {
  return entries.find(
    (entry) => JSON.stringify(entry.path) === JSON.stringify(path)
  );
}
