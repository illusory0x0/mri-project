import type {
  Arm,
  ArmSummary,
  ReportData,
  RunResult,
  SemanticVerdict,
  Task,
} from "./types.js";

interface TranscriptMessage {
  role?: string;
  content?: string | null;
  reasoning_content?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface OutlineNode {
  path: number[];
  kind: string;
  head?: string;
  value?: string;
}

declare global {
  interface Window {
    __REPORT_DATA__: ReportData;
  }
}

const DATA = window.__REPORT_DATA__;

const ARM_LABEL: Record<string, string> = {
  direct: "direct · 直接改写",
  "ast-edit": "ast-edit · 结构化编辑",
  "text-edit": "text-edit · Shell 编辑",
  diff: "diff · Unified Diff",
};
const ARM_COLOR: Record<string, string> = {
  direct: "#58a6ff",
  "ast-edit": "#bc8cff",
  "text-edit": "#3fb950",
  diff: "#f0883e",
};
const ROLE_LABEL: Record<string, string> = {
  system: "系统提示",
  user: "用户提示",
  assistant: "助手",
  tool: "工具返回",
};
const SEMANTIC_LABEL: Record<SemanticVerdict, string> = {
  equal: "等价",
  different: "不等价",
  unknown: "未知",
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(v: unknown): string {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
function fmt(n: unknown): string {
  if (typeof n !== "number") return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function armLabel(a: string): string {
  return ARM_LABEL[a] || a;
}
function armColor(a: string): string {
  return ARM_COLOR[a] || "#8b949e";
}
function parseJsonish(s: string | null | undefined): unknown {
  try {
    return JSON.parse(s as string);
  } catch {
    return null;
  }
}
function commandOf(name: string | undefined, raw: string | null | undefined): string {
  const o = parseJsonish(raw);
  if (o && typeof o === "object") {
    const obj = o as { args?: unknown; command?: unknown };
    if (name === "lisp_editor" && Array.isArray(obj.args)) {
      return "lisp-editor " + obj.args.join(" ");
    }
    if (name === "shell" && typeof obj.command === "string") return obj.command;
  }
  return raw == null ? "" : String(raw);
}

function el(tag: string, cls?: string | null, text?: unknown): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}
function codeBlock(cls: string | null | undefined, text: unknown): HTMLElement {
  const p = el("pre", cls || "code");
  p.textContent = text == null ? "" : String(text);
  return p;
}
function labeled(label: string, node: Node): HTMLElement {
  const w = el("div", "lbl");
  w.appendChild(el("div", "lblt", label));
  w.appendChild(node);
  return w;
}
function bar(value: number, max: number, color: string): string {
  let w = max > 0 ? (value / max) * 100 : 0;
  if (w > 0 && w < 2) w = 2;
  return '<div class="bar"><span style="width:' + w + "%;background:" + color + '"></span></div>';
}
function scoreCell(value: number, total: number): string {
  const numerator = Math.round(value * total);
  const cls = total > 0 && numerator >= total ? "ok" : "bad";
  return '<span class="score ' + cls + '">' + numerator + "/" + total + "</span>";
}

function renderStats(): void {
  const bits: string[] = [];
  bits.push(DATA.runs.length + " 次运行");
  bits.push(DATA.tasks.length + " 个任务");
  bits.push(DATA.armNames.length + " 种编辑方式");
  if (DATA.models.length) bits.push("模型 " + DATA.models.join(", "));
  if (DATA.temperatures.length) bits.push("temperature " + DATA.temperatures.join(", "));
  document.getElementById("stats")!.textContent = bits.join("  ·  ");
}

function summaryTable(rows: ArmSummary[]): string {
  const maxTok = Math.max(1, ...rows.map((x) => x.meanTokens));
  let html =
    '<table class="grid"><thead><tr>' +
    "<th>编辑方式</th>" +
    '<th class="num">成功@1</th><th class="num">结构</th><th class="num">语义</th>' +
    '<th class="num">平均步数</th><th class="num">平均 Tokens</th>' +
    "</tr></thead><tbody>";
  rows.forEach(function (row) {
    const c = armColor(row.arm);
    const semantic = row.semanticScored
      ? scoreCell(row.semanticRate, row.semanticScored) +
        (row.semanticUnknown ? '<div class="mini">未知 ' + row.semanticUnknown + "</div>" : "")
      : '<span class="muted">—</span>';
    html +=
      "<tr>" +
      '<td class="armname" style="color:' + c + '">' + esc(armLabel(row.arm)) + "</td>" +
      '<td class="num">' + scoreCell(row.successRate, row.runs) + "</td>" +
      '<td class="num">' + scoreCell(row.structuralRate, row.runs) + "</td>" +
      '<td class="num">' + semantic + "</td>" +
      '<td class="num">' + fmt(row.meanSteps) + "</td>" +
      '<td class="num"><div class="metric">' + bar(row.meanTokens, maxTok, c) + '<span class="mval">' + row.meanTokens.toLocaleString() + "</span></div></td>" +
      "</tr>";
  });
  return html + "</tbody></table>";
}

function renderSummary(): void {
  const excluded = DATA.bracketDanger.taskIds.length;
  const note =
    '<p class="note">上方汇总已排除 ' +
    excluded +
    ' 个括号危险任务（见 <a href="#bracket-danger">括号危险可靠性单元</a>）。</p>';
  document.getElementById("summary")!.innerHTML = summaryTable(DATA.summary) + note;
}

function renderBracketDanger(): void {
  const cell = DATA.bracketDanger;
  const box = document.getElementById("bracket-danger");
  if (!box) return;
  if (!cell || cell.summary.length === 0) {
    box.innerHTML = '<p class="muted">没有括号危险任务的结果。</p>';
    return;
  }
  let html = summaryTable(cell.summary);
  html +=
    '<p class="note">括号危险单元包含 ' +
    cell.taskIds.length +
    " 个任务：" +
    esc(cell.taskIds.join(", ")) +
    "。这些任务已从上方表格中排除，其解析失败率、括号不匹配率与补丁应用失败率在此单独统计。</p>";
  let rates =
    '<table class="grid"><thead><tr><th>编辑方式</th><th class="num">解析失败率</th><th class="num">括号不匹配率</th><th class="num">补丁应用失败率</th></tr></thead><tbody>';
  cell.summary.forEach(function (row) {
    const c = armColor(row.arm);
    rates +=
      "<tr>" +
      '<td class="armname" style="color:' + c + '">' + esc(armLabel(row.arm)) + "</td>" +
      '<td class="num">' + fmt(row.parseErrorRate * 100) + "%</td>" +
      '<td class="num">' + fmt(row.parenMismatchRate * 100) + "%</td>" +
      '<td class="num">' + fmt(row.hunkFailureRate * 100) + "%</td>" +
      "</tr>";
  });
  box.innerHTML = html + rates + "</tbody></table>";
}

function renderMatrix(): void {
  let html = '<table class="grid matrix"><thead><tr><th>任务</th>';
  DATA.armNames.forEach(function (a) {
    html += '<th style="color:' + armColor(a) + '">' + esc(a) + "</th>";
  });
  html += "</tr></thead><tbody>";
  DATA.tasks.forEach(function (task) {
    const directRun = DATA.runs.filter(function (r) {
      return r.taskId === task.id && r.arm === "direct";
    })[0];
    const baseTok = directRun ? directRun.tokens : 0;
    html +=
      '<tr><td class="taskcell"><div class="tid">' + esc(task.id) + "</div>" +
      '<div class="ins">' + esc(task.instruction) + "</div>" +
      '<div class="tags"><span class="tag">' + esc(task.construct) + "</span>" +
      '<span class="tag alt">' + esc(task.locate) + "</span>" +
      '<span class="tag alt">depth ' + task.depth + "</span>" +
      (task.bracketDanger ? '<span class="tag">bracket</span>' : "") +
      "</div>" +
      "</td>";
    DATA.armNames.forEach(function (a) {
      const cellRuns = DATA.runs.filter(function (r) {
        return r.taskId === task.id && r.arm === a;
      });
      if (!cellRuns.length) {
        html += '<td class="na">—</td>';
        return;
      }
      const r = cellRuns[0];
      const ratio = baseTok > 0 ? '<span class="ratio">×' + (r.tokens / baseTok).toFixed(1) + "</span>" : "";
      html +=
        '<td><button class="cell ' + (r.success ? "ok" : "bad") + '"' +
        ' data-task="' + esc(task.id) + '" data-arm="' + esc(a) + '">' +
        '<span class="mark">' + (r.success ? "✓" : "✗") + "</span>" +
        '<span class="mini">' + r.steps + " 步 · " + r.tokens.toLocaleString() + " tok " + ratio + "</span>" +
        "</button></td>";
    });
    html += "</tr>";
  });
  document.getElementById("matrix")!.innerHTML = html + "</tbody></table>";
}

function renderOutline(nodes: OutlineNode[]): HTMLElement {
  const wrap = el("div", "outline");
  nodes.slice(0, 40).forEach(function (n) {
    const row = el("div", "orow" + (n.kind === "hole" ? " hole" : ""));
    row.appendChild(el("span", "opath", JSON.stringify(n.path)));
    if (n.kind === "apply") {
      row.appendChild(el("span", "okind", "apply"));
      row.appendChild(el("span", "otag", n.head));
    } else if (n.value != null) {
      row.appendChild(el("span", "otag", n.kind + ":" + n.value));
    } else {
      row.appendChild(el("span", "okind", n.kind));
    }
    wrap.appendChild(row);
  });
  if (nodes.length > 40) wrap.appendChild(el("div", "muted", "… 共 " + nodes.length + " 个节点"));
  return wrap;
}

function renderResult(content: string | null | undefined): HTMLElement {
  const obj = parseJsonish(content) as Record<string, any> | null;
  if (!obj) return codeBlock("result", content == null ? "" : String(content));
  if (obj.ok === true && typeof obj.source === "string") {
    return labeled("程序状态（replace 后的完整源码）", codeBlock("code lisp", obj.source));
  }
  if (obj.ok === true && typeof obj.output === "string") {
    const out = parseJsonish(obj.output);
    if (Array.isArray(out)) return labeled("outline（节点路径）", renderOutline(out));
  }
  if (obj.ok === false) {
    return labeled("错误", codeBlock("result err", obj.error || JSON.stringify(obj)));
  }
  if (typeof obj.code === "number") {
    const parts: string[] = [];
    if (obj.stdout) parts.push("$ stdout" + "\n" + obj.stdout);
    if (obj.stderr) parts.push("$ stderr" + "\n" + obj.stderr);
    parts.push("exit " + obj.code);
    return labeled("命令输出", codeBlock("result term", parts.join("\n")));
  }
  return labeled("工具返回", codeBlock("result", JSON.stringify(obj, null, 2)));
}

function turnCard(role: string, title: string): { root: HTMLElement; body: HTMLElement } {
  const root = el("div", "turn role-" + role);
  const head = el("div", "turnhead");
  head.appendChild(el("span", "pill", title));
  root.appendChild(head);
  const body = el("div", "turnbody");
  root.appendChild(body);
  return { root: root, body: body };
}

function renderTimeline(run: RunResult): HTMLElement {
  const messages = (run.transcript || []) as TranscriptMessage[];
  const idxById: Record<string, number> = {};
  messages.forEach(function (m, i) {
    if (m.role === "tool" && m.tool_call_id) idxById[m.tool_call_id] = i;
  });
  const used: Record<number, boolean> = {};
  let step = 0;
  const tl = el("div", "timeline");

  messages.forEach(function (m, i) {
    if (used[i]) return;
    const role = m.role || "unknown";

    if (role === "system" || role === "user") {
      const card = turnCard(role, ROLE_LABEL[role]);
      card.body.appendChild(
        labeled(
          role === "system" ? "发送给模型的 system 消息" : "发送给模型的 user 消息",
          codeBlock("content " + (role === "system" ? "sys" : ""), m.content)
        )
      );
      tl.appendChild(card.root);
      return;
    }

    if (role === "assistant") {
      const acard = turnCard("assistant", "助手回复");
      if (m.reasoning_content) {
        const d = el("details", "reason");
        d.appendChild(el("summary", null, "推理过程 reasoning_content（点击展开）"));
        d.appendChild(codeBlock("reason-body", m.reasoning_content));
        acard.body.appendChild(d);
      }
      const calls = m.tool_calls || [];
      calls.forEach(function (c) {
        step++;
        const f = c.function || {};
        const st = el("div", "step");
        st.appendChild(el("div", "stephead", "步骤 " + step + " · 工具调用 " + (f.name || "tool")));
        st.appendChild(labeled("arguments（可读命令）", codeBlock("result cmd", commandOf(f.name, f.arguments))));
        const parsed = parseJsonish(f.arguments);
        if (parsed && typeof parsed === "object" && Array.isArray((parsed as { args?: unknown }).args)) {
          st.appendChild(
            labeled("lisp-editor args 数组", codeBlock("result", JSON.stringify((parsed as { args: unknown[] }).args)))
          );
        }
        const ti = c.id != null ? idxById[c.id] : undefined;
        if (ti != null) {
          used[ti] = true;
          st.appendChild(labeled("工具返回", renderResult(messages[ti].content)));
        } else {
          st.appendChild(el("div", "muted", "（未找到对应的 tool 返回）"));
        }
        acard.body.appendChild(st);
      });
      if (m.content) acard.body.appendChild(labeled("回复内容", codeBlock("content answer", m.content)));
      tl.appendChild(acard.root);
      return;
    }

    if (role === "tool") {
      const tcard = turnCard("tool", "工具返回（未配对）");
      tcard.body.appendChild(renderResult(m.content));
      tl.appendChild(tcard.root);
      return;
    }

    const ucard = turnCard("unknown", "未知消息");
    ucard.body.appendChild(codeBlock("content", JSON.stringify(m, null, 2)));
    tl.appendChild(ucard.root);
  });
  return tl;
}

function renderRequestContext(run: RunResult): HTMLElement {
  const arm: Pick<Arm, "name" | "tools"> =
    DATA.armDefs.filter(function (a) {
      return a.name === run.arm;
    })[0] || { name: run.arm, tools: [] };
  const wrap = el("div", "reqctx");

  const params = el("table", "grid keyval");
  const transcript = (run.transcript || []) as TranscriptMessage[];
  const rows: Array<[string, string]> = [
    ["arm", arm.name],
    ["model", run.model || "(default)"],
    ["temperature", String(run.temperature == null ? "(default)" : run.temperature)],
    ["tools", arm.tools && arm.tools.length ? arm.tools.join(", ") : "(无工具)"],
    ["message 数", String(transcript.length)],
    ["steps", fmt(run.steps)],
    ["tokens", run.tokens.toLocaleString()],
    ["task", run.taskId],
  ];
  rows.forEach(function (r) {
    const tr = el("tr");
    tr.appendChild(el("th", null, r[0]));
    tr.appendChild(el("td", null, r[1]));
    params.appendChild(tr);
  });
  wrap.appendChild(labeled("请求参数（每次 /chat/completions 调用）", params));

  const sys = transcript.filter(function (m) {
    return m.role === "system";
  })[0];
  wrap.appendChild(
    labeled("system prompt（原样发送）", codeBlock("content sys", sys ? sys.content : "(无)"))
  );

  (arm.tools || []).forEach(function (name) {
    const spec = DATA.toolSpecs[name];
    const box = el("div", "toolspec");
    box.appendChild(el("div", "tooltitle", "工具定义 · " + name));
    box.appendChild(el("div", "lblt", "description"));
    box.appendChild(codeBlock("content", spec ? spec.description : "(缺失)"));
    box.appendChild(el("div", "lblt", "parameters (JSON Schema)"));
    box.appendChild(codeBlock("content", spec ? JSON.stringify(spec.parameters, null, 2) : "{}"));
    wrap.appendChild(box);
  });

  return wrap;
}

function stepLines(transcript: TranscriptMessage[]): string[] {
  const out: string[] = [];
  (transcript || []).forEach(function (m) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      m.tool_calls.forEach(function (c) {
        const f = c.function || {};
        out.push((f.name || "tool") + ": " + commandOf(f.name, f.arguments));
      });
    }
  });
  return out;
}

function renderCompare(taskId: string): HTMLElement {
  const wrap = el("div", "compare");
  DATA.armNames.forEach(function (a) {
    const run = DATA.runs.filter(function (r) {
      return r.taskId === taskId && r.arm === a;
    })[0];
    const col = el("div", "cmpcol");
    const title = el("div", "cmparm");
    title.style.color = armColor(a);
    title.appendChild(el("span", null, a));
    if (run) {
      title.appendChild(el("span", "badge " + (run.success ? "ok" : "bad"), run.success ? "成功" : "失败"));
    }
    col.appendChild(title);
    if (!run) {
      col.appendChild(el("div", "muted", "无结果"));
      wrap.appendChild(col);
      return;
    }
    col.appendChild(el("div", "cmpsub", run.steps + " 步 · " + run.tokens.toLocaleString() + " tokens"));
    const cmds = stepLines((run.transcript || []) as TranscriptMessage[]);
    if (cmds.length) {
      const ol = el("ol", "cmdlist");
      cmds.forEach(function (cmd) {
        const li = el("li");
        li.appendChild(codeBlock("result cmd", cmd));
        ol.appendChild(li);
      });
      col.appendChild(labeled("工具调用序列", ol));
    } else {
      col.appendChild(el("div", "muted", "无工具调用，直接返回完整程序"));
    }
    col.appendChild(labeled("最终产物", codeBlock("code", run.finalArtifact)));
    wrap.appendChild(col);
  });
  return wrap;
}

function tabs(names: string[]): { bar: HTMLElement; panes: HTMLElement[] } {
  const bar = el("div", "tabbar");
  const panes: HTMLElement[] = [];
  const buttons: HTMLElement[] = [];
  names.forEach(function (name, i) {
    const b = el("button", "tab" + (i === 0 ? " active" : ""), name);
    b.addEventListener("click", function () {
      buttons.forEach(function (x) {
        x.classList.remove("active");
      });
      panes.forEach(function (x) {
        x.classList.add("hidden");
      });
      b.classList.add("active");
      panes[i].classList.remove("hidden");
    });
    bar.appendChild(b);
    buttons.push(b);
    const p = el("div", "pane" + (i === 0 ? "" : " hidden"));
    panes.push(p);
  });
  return { bar: bar, panes: panes };
}

let overlay!: HTMLElement;
let modalBody!: HTMLElement;
function closeModal(): void {
  overlay.classList.add("hidden");
  modalBody.innerHTML = "";
}

function openDetail(taskId: string, arm: string): void {
  const task: Partial<Task> =
    DATA.tasks.filter(function (t) {
      return t.id === taskId;
    })[0] || { id: taskId };
  const runs = DATA.runs.filter(function (r) {
    return r.taskId === taskId && r.arm === arm;
  });
  const run = runs[0];
  if (!run) return;

  modalBody.innerHTML = "";

  const head = el("div", "modalhead");
  const h = el("h2", null, taskId + " · ");
  const armSpan = el("span", null, armLabel(arm));
  armSpan.style.color = armColor(arm);
  h.appendChild(armSpan);
  head.appendChild(h);
  head.appendChild(el("span", "badge " + (run.success ? "ok" : "bad"), run.success ? "成功" : "失败"));
  modalBody.appendChild(head);

  const chips = el("div", "chips");
  const semanticLabel =
    run.semantic == null ? "无探针" : SEMANTIC_LABEL[run.semantic];
  (
    [
      ["步数", fmt(run.steps)],
      ["Tokens", run.tokens.toLocaleString()],
      ["深度", String(run.depth)],
      ["结构", run.structural ? "一致" : "不一致"],
      ["语义", semanticLabel],
      ["解析", run.parsed ? "通过" : "失败"],
      ["括号", run.parenMismatch ? "不匹配" : "匹配"],
      ["求值", run.evaluates ? "通过" : "失败"],
    ] as Array<[string, string]>
  ).forEach(function (p) {
    const c = el("span", "chip");
    c.innerHTML = "<b>" + esc(p[0]) + "</b> " + esc(p[1]);
    chips.appendChild(c);
  });
  modalBody.appendChild(chips);

  const taskBox = el("section", "block");
  taskBox.appendChild(el("h3", null, "任务"));
  if (task.instruction) taskBox.appendChild(el("p", "ins", task.instruction));
  if (task.input) {
    taskBox.appendChild(el("div", "codehead", "输入"));
    taskBox.appendChild(codeBlock("code", task.input));
  }
  if (task.expected) {
    taskBox.appendChild(el("div", "codehead", "期望输出"));
    taskBox.appendChild(codeBlock("code", task.expected));
  }
  modalBody.appendChild(taskBox);

  const t = tabs(["对话（Prompt 交换）", "请求上下文", "各方式对比"]);
  modalBody.appendChild(t.bar);
  t.panes[0].appendChild(renderTimeline(run));
  t.panes[1].appendChild(renderRequestContext(run));
  t.panes[2].appendChild(renderCompare(taskId));
  t.panes.forEach(function (p) {
    modalBody.appendChild(p);
  });

  overlay.classList.remove("hidden");
}

function main(): void {
  overlay = document.getElementById("overlay")!;
  modalBody = document.getElementById("modalbody")!;
  renderStats();
  renderSummary();
  renderMatrix();
  renderBracketDanger();
  document.getElementById("matrix")!.addEventListener("click", function (e) {
    const target = e.target as Element | null;
    const btn = target && target.closest ? target.closest(".cell") : null;
    if (!btn) return;
    openDetail(btn.getAttribute("data-task") ?? "", btn.getAttribute("data-arm") ?? "");
  });
  document.getElementById("close")!.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });
}
document.addEventListener("DOMContentLoaded", main);
