import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadArms, loadJsonDir, summarize } from "./runner.js";
import { TOOL_SPECS } from "./tools.js";
import { ARM_NAMES, ReportData, RunResult, Task } from "./types.js";

const CLIENT_PATH = path.join(import.meta.dirname, "report.client.js");

function shell(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lisp 编辑评测结果</title>
<style>
:root {
  --bg: #0d1117; --panel: #161b22; --panel2: #1c2128; --border: #30363d;
  --fg: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
  --green: #3fb950; --red: #f85149; --amber: #d29922;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
header { padding: 26px 28px 10px; }
h1 { margin: 0 0 6px; font-size: 22px; }
h2 { margin: 0; font-size: 18px; }
h3 { margin: 0 0 10px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
main { padding: 0 28px 60px; max-width: 1200px; }
p.sub { color: var(--muted); margin: 0 0 4px; }
section.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin: 18px 0; }
.note { color: var(--muted); font-size: 12.5px; margin: 10px 0 0; }
table.grid { width: 100%; border-collapse: collapse; }
table.grid th, table.grid td { text-align: left; padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
table.grid th { color: var(--muted); font-weight: 600; font-size: 12.5px; white-space: nowrap; }
table.grid th.num, table.grid td.num { text-align: right; }
table.grid th.num { padding-right: 10px; }
table.grid tbody tr:hover { background: var(--panel2); }
.armname { font-weight: 600; white-space: nowrap; }
.ok { color: var(--green); }
.bad { color: var(--red); }
.metric { position: relative; height: 20px; }
.mval { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-variant-numeric: tabular-nums; z-index: 10; white-space: nowrap; text-shadow: 0 0 4px rgba(0,0,0,.8), 0 0 4px rgba(0,0,0,.8); }
.bar { position: absolute; inset: 0; width: 100%; height: 100%; background: #21262d; border-radius: 4px; overflow: hidden; z-index: 0; }
.bar span { display: block; height: 100%; border-radius: 4px; }
.bar.health { display: flex; gap: 2px; background: #161b22; padding: 2px 0; overflow: visible; border-radius: 4px; }
.bar.health .seg { flex: 1; height: calc(100% - 4px); background: #2d333b; border: 1px solid #3d444d; border-radius: 2px; }
.taskcell { max-width: 360px; }
.tid { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent); }
.ins { color: var(--muted); font-size: 12.5px; }
.tags { display: flex; gap: 6px; margin-top: 6px; }
.tag { font-size: 10.5px; letter-spacing: .03em; text-transform: uppercase; color: var(--accent); background: #1f2a3a; border: 1px solid #2d4a6b; border-radius: 20px; padding: 1px 8px; }
.tag.alt { color: var(--muted); background: #20242b; border-color: var(--border); }
.cell {
  width: 100%; cursor: pointer; background: var(--panel2); border: 1px solid var(--border);
  border-radius: 8px; padding: 7px 8px; color: var(--fg); display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
}
.cell:hover { border-color: var(--accent); }
.cell .mark { font-size: 15px; font-weight: 700; }
.cell.ok .mark { color: var(--green); }
.cell.bad .mark { color: var(--red); }
.mini { color: var(--muted); font-size: 11.5px; }
.ratio { color: var(--amber); font-weight: 600; }
td.na { color: var(--muted); }
.overlay {
  position: fixed; inset: 0; background: rgba(1, 4, 9, .78); display: flex;
  align-items: flex-start; justify-content: center; padding: 24px 16px; overflow: auto; z-index: 20;
}
.overlay.hidden { display: none; }
.modal { position: relative; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; width: min(1240px, 100%); padding: 22px 24px 40px; }
#close { position: absolute; top: 12px; right: 14px; background: none; border: 0; color: var(--muted); font-size: 24px; cursor: pointer; line-height: 1; z-index: 2; }
#close:hover { color: var(--fg); }
.modalhead { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-right: 30px; flex-wrap: wrap; }
.badge { font-size: 12px; padding: 2px 9px; border-radius: 20px; border: 1px solid var(--border); }
.badge.ok { color: var(--green); border-color: var(--green); }
.badge.bad { color: var(--red); border-color: var(--red); }
.picker { margin-bottom: 12px; color: var(--muted); }
.picker select { background: var(--panel2); color: var(--fg); border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; margin-left: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.chip { background: var(--panel2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 11px; font-size: 12.5px; color: var(--muted); }
.chip b { color: var(--fg); font-weight: 600; }
.block { border-top: 1px solid var(--border); padding-top: 16px; margin-top: 16px; }
.codehead, .lblt, .tooltitle { font-size: 12px; color: var(--muted); margin: 8px 0 4px; }
.tooltitle { color: var(--fg); font-weight: 600; font-size: 13px; }
pre { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin: 0 0 10px; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 12.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
pre.sys { border-color: #4a3b1a; }
pre.answer { border-color: var(--green); }
pre.cmd { border-color: #3a3f5a; color: #c9d1ff; }
pre.term { background: #05080d; }
pre.err { border-color: var(--red); color: #ffb4b0; }
.tabs { margin-top: 4px; }
.tabbar { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 16px; position: sticky; top: 0; background: var(--panel); z-index: 1; padding-top: 6px; }
.tab { background: none; border: 0; border-bottom: 2px solid transparent; color: var(--muted); padding: 8px 14px; cursor: pointer; font-size: 13.5px; }
.tab:hover { color: var(--fg); }
.tab.active { color: var(--fg); border-bottom-color: var(--accent); }
.pane.hidden { display: none; }
.lbl { margin-bottom: 10px; }
.timeline { display: flex; flex-direction: column; gap: 12px; }
.turn { border: 1px solid var(--border); border-left-width: 3px; border-radius: 8px; padding: 10px 12px; background: var(--panel2); }
.turn.role-system { border-left-color: var(--amber); }
.turn.role-user { border-left-color: var(--accent); }
.turn.role-assistant { border-left-color: #bc8cff; }
.turn.role-tool { border-left-color: var(--green); }
.turnhead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.pill { font-size: 11.5px; font-weight: 600; padding: 2px 9px; border-radius: 20px; background: #21262d; }
details.reason { margin-bottom: 8px; }
details.reason summary { cursor: pointer; color: var(--muted); font-size: 12.5px; margin-bottom: 6px; }
.step { border: 1px dashed #3a4148; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: #14181e; }
.stephead { font-size: 12.5px; font-weight: 600; color: #c9d1ff; margin-bottom: 6px; }
.outline { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.orow { display: flex; align-items: center; gap: 6px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font: 12px ui-monospace, Menlo, monospace; }
.orow.hole { border-color: var(--amber); }
.opath { color: var(--accent); }
.otag { color: var(--fg); }
.okind { color: var(--muted); font-size: 11px; }
.muted { color: var(--muted); }
table.keyval th { width: 130px; color: var(--muted); font-weight: 500; }
.toolspec { border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px; }
.reqctx .lbl { margin-bottom: 14px; }
.compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
.cmpcol { background: var(--panel2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
.cmparm { font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.cmpsub { color: var(--muted); font-size: 12.5px; margin-bottom: 10px; }
.cmdlist { margin: 0 0 10px; padding-left: 20px; }
.cmdlist li { margin-bottom: 6px; }
.cmdlist pre { margin: 0; }
</style>
</head>
<body>
<header>
  <h1>Lisp 编辑评测结果</h1>
  <p class="sub" id="stats"></p>
</header>
<main>
  <section class="panel">
    <h3>编辑方式对比</h3>
    <div id="summary"></div>
  </section>
  <section class="panel">
    <h3>各任务结果</h3>
    <div id="matrix"></div>
    <p class="note">点击任意单元格，查看该次运行的完整 Prompt 交换、请求上下文与各方式步骤对比。</p>
  </section>
</main>
<div id="overlay" class="overlay hidden">
  <div class="modal">
    <button id="close" aria-label="关闭">&times;</button>
    <div id="modalbody"></div>
  </div>
</div>
<script>window.__REPORT_DATA__ = /*__DATA__*/;</script>
<script>
/*__CLIENT__*/
</script>
</body>
</html>
`;
}

function orderedArms(runs: RunResult[]): string[] {
  const present = new Set(runs.map((run) => run.arm as string));
  const known = ARM_NAMES.filter((arm) => present.has(arm));
  const extra = [...present].filter((arm) => !ARM_NAMES.includes(arm as never)).sort();
  return [...known, ...extra];
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let resultsDir = path.resolve(process.cwd(), "eval/results");
  let tasksDir = path.resolve(process.cwd(), "eval/tasks");
  let armsDir = path.resolve(process.cwd(), "eval/arms");
  let outFile = path.resolve(process.cwd(), "eval/report.html");
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--results" || flag === "--tasks" || flag === "--arms" || flag === "--out") {
      const value = argv[++i];
      if (value === undefined) throw new Error(`missing value for ${flag}`);
      if (flag === "--results") resultsDir = path.resolve(value);
      if (flag === "--tasks") tasksDir = path.resolve(value);
      if (flag === "--arms") armsDir = path.resolve(value);
      if (flag === "--out") outFile = path.resolve(value);
    } else {
      throw new Error(`unknown option: ${flag}`);
    }
  }

  const runs = await loadJsonDir<RunResult>(resultsDir, (name) => name !== "summary.json");
  const allTasks = await loadJsonDir<Task>(tasksDir);
  const armDefs = await loadArms(armsDir);
  const tasksById = new Map(allTasks.map((task) => [task.id, task]));
  const taskIds = [...new Set(runs.map((run) => run.taskId))].sort();
  const tasks = taskIds.map(
    (id): Task =>
      tasksById.get(id) ??
        { id, locate: "explicit", construct: "atom", instruction: "", input: "", expected: "" }
  );

  const data: ReportData = {
    generatedAt: new Date().toISOString(),
    models: [...new Set(runs.map((run) => run.model ?? "mock"))],
    temperatures: [...new Set(runs.map((run) => String(run.temperature ?? "default")))],
    armNames: orderedArms(runs),
    armDefs,
    toolSpecs: TOOL_SPECS,
    tasks,
    runs,
    summary: summarize(runs),
  };

  const payload = JSON.stringify(data).replace(/</g, "\\u003c");
  const client = await readFile(CLIENT_PATH, "utf8");
  const html = shell()
    .replace("/*__DATA__*/", () => payload)
    .replace("/*__CLIENT__*/", () => client);
  await writeFile(outFile, html, "utf8");
  process.stdout.write(`wrote ${outFile} (${runs.length} runs, ${data.tasks.length} tasks)\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
