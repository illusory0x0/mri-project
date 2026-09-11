import assert from "node:assert/strict";
import { test } from "node:test";
import { MockDriver } from "../eval/drivers/mock.js";
import { runOne, summarize } from "../eval/runner.js";
import { scoreArtifact } from "../eval/scorer.js";
import { Arm, RunResult, Task } from "../eval/types.js";

const directArm: Arm = { name: "direct", systemPrompt: "test", tools: [] };
const editorArm: Arm = {
  name: "editor",
  systemPrompt: "test",
  tools: ["lisp_editor"],
};
const sedawkArm: Arm = { name: "sedawk", systemPrompt: "test", tools: ["shell"] };

const task: Task = {
  id: "t-increment",
  nesting: 4,
  instruction: "increment",
  input: "(define (f x) x)",
  expected: "(define (f x) (+ x 1))",
};

test("scorer: matching program is a success", async () => {
  const score = await scoreArtifact("(define (f x) (+ x 1))", task.expected);
  assert.equal(score.parsed, true);
  assert.equal(score.parenMismatch, false);
  assert.equal(score.evaluates, true);
  assert.equal(score.success, true);
});

test("scorer: unbalanced program is a paren mismatch", async () => {
  const score = await scoreArtifact("(define (f x)", task.expected);
  assert.equal(score.parsed, false);
  assert.equal(score.parenMismatch, true);
  assert.equal(score.success, false);
});

test("scorer: parseable but different program is not a success", async () => {
  const score = await scoreArtifact("(define (f x) 0)", task.expected);
  assert.equal(score.parsed, true);
  assert.equal(score.success, false);
});

test("runOne: direct arm scores its typed artifact", async () => {
  const result = await runOne(new MockDriver(), directArm, task, 0);
  assert.equal(result.success, true);
});

test("runOne: direct arm's broken artifact is a paren mismatch", async () => {
  const broken: Task = { ...task, id: "t-broken" };
  const result = await runOne(new MockDriver(), directArm, broken, 0);
  assert.equal(result.parsed, false);
  assert.equal(result.parenMismatch, true);
  assert.equal(result.success, false);
});

test("runOne: sedawk arm scores the edited file", async () => {
  const result = await runOne(new MockDriver(), sedawkArm, task, 0);
  assert.equal(result.success, true);
  assert.ok(result.steps >= 1);
});

test("runOne: tool arms cannot bypass the tool with typed output", async () => {
  const result = await runOne(new MockDriver(), editorArm, task, 0);
  assert.equal(result.finalArtifact.trim(), "_");
  assert.notEqual(result.finalArtifact.trim(), task.expected);
});

test("summarize: aggregates rates per arm", () => {
  const make = (
    arm: RunResult["arm"],
    success: boolean,
    parsed: boolean,
    paren: boolean
  ): RunResult => ({
    taskId: "t",
    nesting: 4,
    arm,
    seed: 0,
    parsed,
    parenMismatch: paren,
    evaluates: parsed,
    success,
    parseError: null,
    steps: 2,
    tokens: 100,
    finalArtifact: "",
    transcript: [],
  });

  const summaries = summarize([
    make("editor", true, true, false),
    make("editor", false, false, true),
    make("direct", true, true, false),
  ]);

  const editor = summaries.find((summary) => summary.arm === "editor")!;
  assert.equal(editor.runs, 2);
  assert.equal(editor.successRate, 0.5);
  assert.equal(editor.parenMismatchRate, 0.5);
  assert.equal(editor.parseErrorRate, 0.5);
  assert.equal(editor.meanSteps, 2);

  const direct = summaries.find((summary) => summary.arm === "direct")!;
  assert.equal(direct.successRate, 1);
});
