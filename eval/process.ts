import { spawn } from "node:child_process";

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ProcessOptions {
  input?: string;
  cwd?: string;
  signal?: AbortSignal;
}

export function runProcess(
  command: string,
  args: string[],
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const onAbort = (): void => {
      child.kill("SIGKILL");
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = (): void => {
      options.signal?.removeEventListener("abort", onAbort);
    };
    child.stdout!.on("data", (data) => (stdout += data));
    child.stderr!.on("data", (data) => (stderr += data));
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ stdout, stderr, code });
    });
    if (options.input !== undefined) child.stdin!.end(options.input);
  });
}
