import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { loadTasks } from "../eval/runner.js";

const root = path.resolve(process.cwd(), "eval/tasks");

test("task sets: the tasks root loads every set, tagged and with unique ids", async () => {
  const tasks = await loadTasks(root);
  const sets = [...new Set(tasks.map((task) => task.set))].sort();
  assert.deepEqual(sets, ["basic", "leetcode", "orthogonal"]);
  assert.equal(tasks.length, 57);
  const ids = tasks.map((task) => task.id);
  assert.equal(new Set(ids).size, ids.length, "task ids are unique across sets");
});

test("task sets: a set subdirectory loads only that set", async () => {
  for (const [set, count] of [
    ["basic", 21],
    ["orthogonal", 16],
    ["leetcode", 20],
  ] as const) {
    const tasks = await loadTasks(path.join(root, set));
    assert.equal(tasks.length, count, set);
    assert.ok(tasks.every((task) => task.set === set), set);
  }
});
