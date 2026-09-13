import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runProcess } from "./process.js";

export async function applyPatch(
  original: string,
  diff: string,
  signal?: AbortSignal
): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "lisp-editor-diff-"));
  try {
    const file = path.join(dir, "program.rkt");
    const content = original.endsWith("\n") ? original : original + "\n";
    await writeFile(file, content, "utf8");
    const diffPath = path.join(dir, "program.patch");
    const diffContent = diff.endsWith("\n") ? diff : diff + "\n";
    await writeFile(diffPath, diffContent, "utf8");
    const result = await runProcess(
      "patch",
      ["-p0", "--no-backup", "-i", diffPath],
      { cwd: dir, signal }
    );
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || "patch failed");
    }
    return await readFile(file, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
