import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "./process.js";
import { Score } from "./types.js";

const SCORER = path.resolve(process.cwd(), "eval/score.rkt");

interface RacketResult {
  parsed: boolean;
  parenMismatch: boolean;
  matches: boolean;
  evaluates: boolean;
  error: string | null;
}

export async function scoreArtifact(
  artifact: string,
  expected?: string
): Promise<Score> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lisp-editor-score-"));
  try {
    const finalPath = path.join(dir, "final.rkt");
    await writeFile(finalPath, artifact, "utf8");
    const args = [SCORER, finalPath];
    if (expected !== undefined) {
      const expectedPath = path.join(dir, "expected.rkt");
      await writeFile(expectedPath, expected, "utf8");
      args.push(expectedPath);
    }

    const result = await runProcess("racket", args);
    if (result.code !== 0) {
      return {
        parsed: false,
        parenMismatch: false,
        evaluates: false,
        success: false,
        error: result.stderr.trim() || "racket scorer failed",
      };
    }

    const parsed = JSON.parse(result.stdout) as RacketResult;
    return {
      parsed: parsed.parsed,
      parenMismatch: parsed.parenMismatch,
      evaluates: parsed.evaluates,
      success: parsed.matches && parsed.evaluates,
      error: parsed.error,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
