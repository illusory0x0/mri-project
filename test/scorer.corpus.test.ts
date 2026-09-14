import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTasks } from "../eval/runner.js";
import { scoreArtifact } from "../eval/scorer.js";

// Golden corpus over the fixed task set. The expected program and the probe come
// from the task itself; the known-wrong candidate is the pre-edit input for
// non-probe tasks and a bespoke parseable-but-wrong program where a probe exists
// (the pre-edit input can be semantically equal, e.g. t16).
const WRONG: Record<string, string> = {
  "t16-delete-binding": "(define (f x) 2)",
  "t17-insert-param": "(define (f a b c) 0)",
  "t18-bootstrap": "(define (square x) 0)",
  "t19-deep-nest": "(define (deep x) 0)",
  "t20-wide-build": "(define (f x) 0)",
  "t21-subtree-move": "(define (f x) 0)",
};

const NON_TERMINATING = "(define (square x) (square x))";

const tasks = await loadTasks();

for (const task of tasks) {
  test(`corpus: ${task.id} expected scores equal`, async () => {
    const score = await scoreArtifact(task.expected, task.expected, task.probe);
    assert.equal(score.parsed, true, task.id);
    assert.equal(score.parenMismatch, false, task.id);
    assert.equal(score.structural, true, task.id);
    assert.equal(score.success, true, task.id);
    assert.equal(score.semantic, task.probe === undefined ? null : "equal", task.id);
  });

  test(`corpus: ${task.id} known-wrong is neither structurally nor semantically equal`, async () => {
    const wrong = WRONG[task.id] ?? task.input;
    assert.ok(wrong.length > 0, `missing known-wrong candidate for ${task.id}`);
    const score = await scoreArtifact(wrong, task.expected, task.probe);
    assert.equal(score.parsed, true, task.id);
    assert.equal(score.parenMismatch, false, task.id);
    assert.equal(score.structural, false, task.id);
    assert.equal(score.semantic, task.probe === undefined ? null : "different", task.id);
  });
}

test("corpus: a genuine reader error is a parse failure and semantically unknown", async () => {
  const task = tasks.find((t) => t.id === "t16-delete-binding")!;
  const score = await scoreArtifact("(define (f x)", task.expected, task.probe);
  assert.equal(score.parsed, false);
  assert.equal(score.parenMismatch, true);
  assert.equal(score.semantic, "unknown");
});

test("corpus: a non-terminating probe is semantically unknown", async () => {
  const task = tasks.find((t) => t.id === "t18-bootstrap")!;
  const score = await scoreArtifact(NON_TERMINATING, task.expected, task.probe);
  assert.equal(score.parsed, true);
  assert.equal(score.structural, false);
  assert.equal(score.semantic, "unknown");
});
