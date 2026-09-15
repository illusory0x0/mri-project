import path from "node:path";

export interface SharedPaths {
  resultsDir: string;
  tasksDir: string;
  armsDir: string;
  outDir: string;
}

export interface SharedPathsOptions {
  cwd: string;
  outDefault: string;
}

const SHARED_FLAGS = new Set([
  "--results",
  "--tasks",
  "--arms",
  "--out",
]);

export function parseSharedPaths(
  argv: string[],
  options: SharedPathsOptions
): { paths: SharedPaths; rest: string[] } {
  const { cwd, outDefault } = options;
  const paths: SharedPaths = {
    resultsDir: path.resolve(cwd, "eval/results"),
    tasksDir: path.resolve(cwd, "eval/tasks"),
    armsDir: path.resolve(cwd, "eval/arms"),
    outDir: path.resolve(cwd, outDefault),
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (SHARED_FLAGS.has(flag)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for ${flag}`);
      if (flag === "--results") paths.resultsDir = path.resolve(value);
      else if (flag === "--tasks") paths.tasksDir = path.resolve(value);
      else if (flag === "--arms") paths.armsDir = path.resolve(value);
      else paths.outDir = path.resolve(value);
    } else {
      rest.push(flag);
    }
  }
  return { paths, rest };
}
