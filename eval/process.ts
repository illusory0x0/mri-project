import { spawn } from "node:child_process";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ProcessOptions {
  input?: string;
  cwd?: string;
}

export function runProcess(
  command: string,
  args: string[],
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout!.on("data", (data) => (stdout += data));
    child.stderr!.on("data", (data) => (stderr += data));
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
    if (options.input !== undefined) child.stdin!.end(options.input);
  });
}
