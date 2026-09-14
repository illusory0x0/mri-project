import { RunResult } from "./types.js";

export function verdictSignature(run: RunResult): string {
  return [run.parsed, run.structural, run.success, run.semantic].join("|");
}

export interface ModalVerdict {
  ok: boolean;
  n: number;
  total: number;
}

export function modalVerdict(runs: RunResult[]): ModalVerdict {
  const groups = new Map<string, RunResult[]>();
  for (const run of runs) {
    const key = verdictSignature(run);
    const list = groups.get(key);
    if (list) list.push(run);
    else groups.set(key, [run]);
  }
  let best: RunResult[] = [];
  for (const group of groups.values()) {
    if (group.length > best.length) best = group;
  }
  return { ok: best[0]?.success ?? false, n: best.length, total: runs.length };
}
