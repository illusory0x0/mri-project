import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadArms, loadJsonDir, summarize } from "./runner.js";
import { TOOL_SPECS } from "./tools.js";
import { ARM_NAMES, Arm, ArmSummary, RunResult, Task, ToolSpec } from "./types.js";

interface ViewerData {
  generatedAt: string;
  models: string[];
  temperatures: string[];
  armNames: string[];
  armDefs: Arm[];
  toolSpecs: Record<string, ToolSpec>;
  tasks: Task[];
  runs: RunResult[];
  summary: ArmSummary[];
}

const CLIENT = `
"use strict";
var DATA = /*__DATA__*/;
var ARM_LABEL = { direct: "direct · 直接改写", editor: "editor · 结构化编辑", sedawk: "sedawk · Shell 编辑" };
var ARM_COLOR = { direct: "#58a6ff", editor: "#bc8cff", sedawk: "#3fb950" };
var ROLE_LABEL = { system: "系统提示", user: "用户提示", assistant: "助手", tool: "工具返回" };

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function fmt(n) {
  if (typeof n !== "number") return String(n);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function pct(x) { return (x * 100).toFixed(1) + "%"; }
function armLabel(a) { return ARM_LABEL[a] || a; }
function armColor(a) { return ARM_COLOR[a] || "#8b949e"; }
function parseJsonish(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
function commandOf(name, raw) {
  var o = parseJsonish(raw);
  if (o) {
    if (name === "lisp_editor" && Array.isArray(o.args)) return "lisp-editor " + o.args.join(" ");
    if (name === "shell" && typeof o.command === "string") return o.command;
  }
  return raw == null ? "" : String(raw);
}

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}
function codeBlock(cls, text) {
  var p = el("pre", cls || "code");
  p.textContent = text == null ? "" : String(text);
  return p;
}
function labeled(label, node) {
  var w = el("div", "lbl");
  w.appendChild(el("div", "lblt", label));
  w.appendChild(node);
  return w;
}
function bar(value, max, color) {
  var w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return '<div class="bar"><span style="width:' + w + "%;background:" + color + '"></span></div>';
}

function renderStats() {
  var bits = [];
  bits.push(DATA.runs.length + " 次运行");
  bits.push(DATA.tasks.length + " 个任务");
  bits.push(DATA.armNames.length + " 种编辑方式");
  if (DATA.models.length) bits.push("模型 " + DATA.models.join(", "));
  if (DATA.temperatures.length) bits.push("temperature " + DATA.temperatures.join(", "));
  document.getElementById("stats").textContent = bits.join("  ·  ");
}

function renderSummary() {
  var s = DATA.summary;
  var maxTok = Math.max.apply(null, s.map(function (x) { return x.meanTokens; }).concat([1]));
  var maxSteps = Math.max.apply(null, s.map(function (x) { return x.meanSteps; }).concat([1]));
  var html = '<table class="grid"><thead><tr>'
    + '<th>编辑方式</th><th class="num">运行数</th><th class="num">解析错误率</th><th class="num">括号不匹配率</th>'
    + '<th class="num">成功率</th><th class="num">平均步数</th><th class="num">平均 Tokens</th>'
    + '</tr></thead><tbody>';
  s.forEach(function (row) {
    var c = armColor(row.arm);
    html += '<tr>'
      + '<td class="armname" style="color:' + c + '">' + esc(armLabel(row.arm)) + '</td>'
      + '<td class="num">' + row.runs + '</td>'
      + '<td class="num">' + pct(row.parseErrorRate) + '</td>'
      + '<td class="num">' + pct(row.parenMismatchRate) + '</td>'
      + '<td class="num ' + (row.successRate === 1 ? "ok" : "bad") + '">' + pct(row.successRate) + '</td>'
      + '<td class="num"><div class="metric">' + bar(row.meanSteps, maxSteps, c) + '<span class="mval">' + fmt(row.meanSteps) + '</span></div></td>'
      + '<td class="num"><div class="metric">' + bar(row.meanTokens, maxTok, c) + '<span class="mval">' + row.meanTokens.toLocaleString() + '</span></div></td>'
      + '</tr>';
  });
  document.getElementById("summary").innerHTML = html + "</tbody></table>";
}

function renderMatrix() {
  var html = '<table class="grid matrix"><thead><tr><th>任务</th>';
  DATA.armNames.forEach(function (a) {
    html += '<th style="color:' + armColor(a) + '">' + esc(a) + "</th>";
  });
  html += "</tr></thead><tbody>";
  DATA.tasks.forEach(function (task) {
    html += '<tr><td class="taskcell"><div class="tid">' + esc(task.id) + '</div>'
      + '<div class="ins">' + esc(task.instruction) + '</div>'
      + '<div class="tags"><span class="tag">' + esc(task.construct) + '</span>'
      + '<span class="tag alt">' + esc(task.locate) + '</span></div>'
      + "</td>";
    DATA.armNames.forEach(function (a) {
      var cellRuns = DATA.runs.filter(function (r) { return r.taskId === task.id && r.arm === a; });
      if (!cellRuns.length) { html += '<td class="na">—</td>'; return; }
      var r = cellRuns[0];
      html += '<td><button class="cell ' + (r.success ? "ok" : "bad") + '"'
        + ' data-task="' + esc(task.id) + '" data-arm="' + esc(a) + '">'
        + '<span class="mark">' + (r.success ? "✓" : "✗") + "</span>"
        + '<span class="mini">' + r.steps + " 步 · " + r.tokens.toLocaleString() + " tok</span>"
        + "</button></td>";
    });
    html += "</tr>";
  });
  document.getElementById("matrix").innerHTML = html + "</tbody></table>";
}

function renderOutline(nodes) {
  var wrap = el("div", "outline");
  nodes.slice(0, 40).forEach(function (n) {
    var row = el("div", "orow" + (n.kind === "hole" ? " hole" : ""));
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

function renderResult(content) {
  var obj = parseJsonish(content);
  if (!obj) return codeBlock("result", content == null ? "" : String(content));
  if (obj.ok === true && typeof obj.source === "string") {
    return labeled("程序状态（replace 后的完整源码）", codeBlock("code lisp", obj.source));
  }
  if (obj.ok === true && typeof obj.output === "string") {
    var out = parseJsonish(obj.output);
    if (Array.isArray(out)) return labeled("outline（节点路径）", renderOutline(out));
  }
  if (obj.ok === false) {
    return labeled("错误", codeBlock("result err", obj.error || JSON.stringify(obj)));
  }
  if (typeof obj.code === "number") {
    var parts = [];
    if (obj.stdout) parts.push("$ stdout" + "\\n" + obj.stdout);
    if (obj.stderr) parts.push("$ stderr" + "\\n" + obj.stderr);
    parts.push("exit " + obj.code);
    return labeled("命令输出", codeBlock("result term", parts.join("\\n")));
  }
  return labeled("工具返回", codeBlock("result", JSON.stringify(obj, null, 2)));
}

function turnCard(role, title) {
  var root = el("div", "turn role-" + role);
  var head = el("div", "turnhead");
  head.appendChild(el("span", "pill", title));
  root.appendChild(head);
  var body = el("div", "turnbody");
  root.appendChild(body);
  return { root: root, body: body };
}

function renderTimeline(run) {
  var messages = run.transcript || [];
  var idxById = {};
  messages.forEach(function (m, i) {
    if (m.role === "tool" && m.tool_call_id) idxById[m.tool_call_id] = i;
  });
  var used = {};
  var step = 0;
  var tl = el("div", "timeline");

  messages.forEach(function (m, i) {
    if (used[i]) return;
    var role = m.role || "unknown";

    if (role === "system" || role === "user") {
      var card = turnCard(role, ROLE_LABEL[role]);
      card.body.appendChild(labeled(
        role === "system" ? "发送给模型的 system 消息" : "发送给模型的 user 消息",
        codeBlock("content " + (role === "system" ? "sys" : ""), m.content)
      ));
      tl.appendChild(card.root);
      return;
    }

    if (role === "assistant") {
      var acard = turnCard("assistant", "助手回复");
      if (m.reasoning_content) {
        var d = el("details", "reason");
        d.appendChild(el("summary", null, "推理过程 reasoning_content（点击展开）"));
        d.appendChild(codeBlock("reason-body", m.reasoning_content));
        acard.body.appendChild(d);
      }
      var calls = m.tool_calls || [];
      calls.forEach(function (c) {
        step++;
        var f = c.function || {};
        var st = el("div", "step");
        st.appendChild(el("div", "stephead", "步骤 " + step + " · 工具调用 " + (f.name || "tool")));
        st.appendChild(labeled("arguments（可读命令）", codeBlock("result cmd", commandOf(f.name, f.arguments))));
        var parsed = parseJsonish(f.arguments);
        if (parsed && Array.isArray(parsed.args)) {
          st.appendChild(labeled("lisp-editor args 数组", codeBlock("result", JSON.stringify(parsed.args))));
        }
        var ti = idxById[c.id];
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
      var tcard = turnCard("tool", "工具返回（未配对）");
      tcard.body.appendChild(renderResult(m.content));
      tl.appendChild(tcard.root);
      return;
    }

    var ucard = turnCard("unknown", "未知消息");
    ucard.body.appendChild(codeBlock("content", JSON.stringify(m, null, 2)));
    tl.appendChild(ucard.root);
  });
  return tl;
}

function renderRequestContext(run) {
  var arm = DATA.armDefs.filter(function (a) { return a.name === run.arm; })[0] || { name: run.arm, tools: [] };
  var wrap = el("div", "reqctx");

  var params = el("table", "grid keyval");
  var rows = [
    ["arm", arm.name],
    ["model", run.model || "(default)"],
    ["temperature", String(run.temperature == null ? "(default)" : run.temperature)],
    ["tools", (arm.tools && arm.tools.length ? arm.tools.join(", ") : "(无工具)")],
    ["message 数", String((run.transcript || []).length)],
    ["steps", fmt(run.steps)],
    ["tokens", run.tokens.toLocaleString()],
    ["task", run.taskId],
  ];
  rows.forEach(function (r) {
    var tr = el("tr");
    tr.appendChild(el("th", null, r[0]));
    tr.appendChild(el("td", null, r[1]));
    params.appendChild(tr);
  });
  wrap.appendChild(labeled("请求参数（每次 /chat/completions 调用）", params));

  var sys = (run.transcript || []).filter(function (m) { return m.role === "system"; })[0];
  wrap.appendChild(labeled(
    "system prompt（原样发送）",
    codeBlock("content sys", sys ? sys.content : "(无)")
  ));

  (arm.tools || []).forEach(function (name) {
    var spec = DATA.toolSpecs[name];
    var box = el("div", "toolspec");
    box.appendChild(el("div", "tooltitle", "工具定义 · " + name));
    box.appendChild(el("div", "lblt", "description"));
    box.appendChild(codeBlock("content", spec ? spec.description : "(缺失)"));
    box.appendChild(el("div", "lblt", "parameters (JSON Schema)"));
    box.appendChild(codeBlock("content", spec ? JSON.stringify(spec.parameters, null, 2) : "{}"));
    wrap.appendChild(box);
  });

  return wrap;
}

function stepLines(transcript) {
  var out = [];
  (transcript || []).forEach(function (m) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
      m.tool_calls.forEach(function (c) {
        var f = c.function || {};
        out.push((f.name || "tool") + ": " + commandOf(f.name, f.arguments));
      });
    }
  });
  return out;
}

function renderCompare(taskId) {
  var wrap = el("div", "compare");
  DATA.armNames.forEach(function (a) {
    var run = DATA.runs.filter(function (r) { return r.taskId === taskId && r.arm === a; })[0];
    var col = el("div", "cmpcol");
    var title = el("div", "cmparm");
    title.style.color = armColor(a);
    title.appendChild(el("span", null, a));
    if (run) title.appendChild(el("span", "badge " + (run.success ? "ok" : "bad"), run.success ? "成功" : "失败"));
    col.appendChild(title);
    if (!run) { col.appendChild(el("div", "muted", "无结果")); wrap.appendChild(col); return; }
    col.appendChild(el("div", "cmpsub", run.steps + " 步 · " + run.tokens.toLocaleString() + " tokens"));
    var cmds = stepLines(run.transcript);
    if (cmds.length) {
      var ol = el("ol", "cmdlist");
      cmds.forEach(function (cmd) {
        var li = el("li");
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

function tabs(names) {
  var bar = el("div", "tabbar");
  var panes = [];
  var buttons = [];
  names.forEach(function (name, i) {
    var b = el("button", "tab" + (i === 0 ? " active" : ""), name);
    b.addEventListener("click", function () {
      buttons.forEach(function (x) { x.classList.remove("active"); });
      panes.forEach(function (x) { x.classList.add("hidden"); });
      b.classList.add("active");
      panes[i].classList.remove("hidden");
    });
    bar.appendChild(b);
    buttons.push(b);
    var p = el("div", "pane" + (i === 0 ? "" : " hidden"));
    panes.push(p);
  });
  return { bar: bar, panes: panes };
}

var overlay, modalBody;
function closeModal() { overlay.classList.add("hidden"); modalBody.innerHTML = ""; }

function openDetail(taskId, arm) {
  var task = DATA.tasks.filter(function (t) { return t.id === taskId; })[0] || { id: taskId };
  var runs = DATA.runs.filter(function (r) { return r.taskId === taskId && r.arm === arm; });
  var run = runs[0];
  if (!run) return;

  modalBody.innerHTML = "";

  var head = el("div", "modalhead");
  var h = el("h2", null, taskId + " · ");
  var armSpan = el("span", null, armLabel(arm));
  armSpan.style.color = armColor(arm);
  h.appendChild(armSpan);
  head.appendChild(h);
  head.appendChild(el("span", "badge " + (run.success ? "ok" : "bad"), run.success ? "成功" : "失败"));
  modalBody.appendChild(head);

  var chips = el("div", "chips");
  [
    ["步数", fmt(run.steps)],
    ["Tokens", run.tokens.toLocaleString()],
    ["解析", run.parsed ? "通过" : "失败"],
    ["括号", run.parenMismatch ? "不匹配" : "匹配"],
    ["求值", run.evaluates ? "通过" : "失败"],
  ].forEach(function (p) {
    var c = el("span", "chip");
    c.innerHTML = "<b>" + esc(p[0]) + "</b> " + esc(p[1]);
    chips.appendChild(c);
  });
  modalBody.appendChild(chips);

  var taskBox = el("section", "block");
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

  var t = tabs(["对话（Prompt 交换）", "请求上下文", "三臂对比"]);
  modalBody.appendChild(t.bar);
  t.panes[0].appendChild(renderTimeline(run));
  t.panes[1].appendChild(renderRequestContext(run));
  t.panes[2].appendChild(renderCompare(taskId));
  t.panes.forEach(function (p) { modalBody.appendChild(p); });

  overlay.classList.remove("hidden");
}

function main() {
  overlay = document.getElementById("overlay");
  modalBody = document.getElementById("modalbody");
  renderStats();
  renderSummary();
  renderMatrix();
  document.getElementById("matrix").addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".cell") : null;
    if (!btn) return;
    openDetail(btn.getAttribute("data-task"), btn.getAttribute("data-arm"));
  });
  document.getElementById("close").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
}
document.addEventListener("DOMContentLoaded", main);
`;

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
.metric { display: flex; align-items: center; gap: 8px; }
.mval { min-width: 5.5em; text-align: right; font-variant-numeric: tabular-nums; }
.bar { flex: 1; min-width: 60px; height: 8px; background: #21262d; border-radius: 4px; overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: 4px; }
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
    <h3>三种编辑方式对比</h3>
    <div id="summary"></div>
    <p class="note">editor 依构造几乎没有括号不匹配，真实信号在成功率、步数与 Tokens。柱状条按各指标三臂最大值缩放。</p>
  </section>
  <section class="panel">
    <h3>各任务结果</h3>
    <div id="matrix"></div>
    <p class="note">点击任意单元格，查看该次运行的完整 Prompt 交换、请求上下文与三臂步骤对比。</p>
  </section>
</main>
<div id="overlay" class="overlay hidden">
  <div class="modal">
    <button id="close" aria-label="关闭">&times;</button>
    <div id="modalbody"></div>
  </div>
</div>
<script>
${CLIENT}
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
  let outFile = path.resolve(process.cwd(), "eval/viewer.html");
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

  const data: ViewerData = {
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
  const html = shell().replace("/*__DATA__*/", payload);
  await writeFile(outFile, html, "utf8");
  process.stdout.write(`wrote ${outFile} (${runs.length} runs, ${data.tasks.length} tasks)\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
