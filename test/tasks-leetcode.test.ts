import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { loadTasks } from "../eval/runner.js";
import { scoreArtifact } from "../eval/scorer.js";
import { OPERATION_KINDS, OperationKind } from "../eval/types.js";

const tasks = await loadTasks(path.resolve(process.cwd(), "eval/tasks/leetcode"));

test("corpus tasks: every task carries provenance and an operation", () => {
  assert.ok(tasks.length >= 20, `expected at least 20 tasks, got ${tasks.length}`);
  for (const task of tasks) {
    assert.equal(task.construct, undefined, `${task.id} uses operation, not construct`);
    assert.ok(
      OPERATION_KINDS.includes(task.operation as OperationKind),
      `${task.id} has a known operation`
    );
    assert.ok(task.source, `${task.id} has a source`);
    assert.ok(task.source!.repo, `${task.id} source.repo`);
    assert.ok(task.source!.file, `${task.id} source.file`);
    assert.ok(task.source!.commit, `${task.id} source.commit`);
  }
});

test("corpus tasks: each structural operation is covered", () => {
  for (const operation of ["wrap-node", "insert-node", "delete-node", "move-subtree"] as OperationKind[]) {
    assert.ok(
      tasks.some((task) => task.operation === operation),
      `no task uses ${operation}`
    );
  }
});

for (const task of tasks) {
  test(`corpus tasks: ${task.id} expected scores equal`, async () => {
    const score = await scoreArtifact(task.expected, task.expected, task.probe);
    assert.equal(score.parsed, true, task.id);
    assert.equal(score.parenMismatch, false, task.id);
    assert.equal(score.structural, true, task.id);
    assert.equal(score.semantic, "equal", task.id);
  });

  test(`corpus tasks: ${task.id} input diverges`, async () => {
    const score = await scoreArtifact(task.input, task.expected, task.probe);
    assert.equal(score.parsed, true, task.id);
    assert.equal(score.structural, false, task.id);
    assert.equal(score.semantic, "different", task.id);
  });
}
