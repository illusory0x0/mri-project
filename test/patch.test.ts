import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPatch } from "../eval/patch.js";
import { runOne } from "../eval/runner.js";
import { AgentDriver, Arm, DriverRequest, DriverResult, Task } from "../eval/types.js";

const nestedInput = `(define (compute x y)
  (+ (* x x)
     (* y y)
     (* x y)))`;
const nestedExpected =
  "(define (compute x y) (let ((total (+ (* x x) (* y y) (* x y)))) total))";
const nestedDiff = `--- program.rkt
+++ program.rkt
@@ -1,4 +1,1 @@
-(define (compute x y)
-  (+ (* x x)
-     (* y y)
-     (* x y)))
+${nestedExpected}
`;

const diffArm: Arm = { name: "diff", systemPrompt: "test", tools: [], diff: true };

function diffDriver(diff: string): AgentDriver {
  return {
    id: "mock",
    config: () => ({}),
    async run(_request: DriverRequest): Promise<DriverResult> {
      return { finalArtifact: diff, steps: 0, tokens: 1, transcript: [] };
    },
  };
}

test("applyPatch: a valid multi-line deeply nested diff applies", async () => {
  const patched = await applyPatch(nestedInput, nestedDiff);
  assert.equal(patched.trim(), nestedExpected);
});

test("applyPatch: a non-applying diff is rejected, not silently misapplied", async () => {
  const bad = `--- program.rkt
+++ program.rkt
@@ -1,1 +1,1 @@
-(nonexistent line)
+(something)
`;
  await assert.rejects(applyPatch(nestedInput, bad));
});

test("applyPatch: malformed diff text is rejected", async () => {
  await assert.rejects(applyPatch(nestedInput, "this is not a valid diff"));
});

test("applyPatch: a no-op diff fails loudly rather than silently misapplying", async () => {
  await assert.rejects(applyPatch(nestedInput, ""));
});

test("applyPatch: a wrong hunk-header line count fails loudly", async () => {
  const wrongCount = `--- program.rkt
+++ program.rkt
@@ -1,99 +1,99 @@
-(define (compute x y)
-  (+ (* x x)
-     (* y y)
-     (* x y)))
+${nestedExpected}
`;
  await assert.rejects(applyPatch(nestedInput, wrongCount));
});

test("applyPatch: an original missing its trailing newline still applies", async () => {
  const original = "(define (f x) x)";
  const diff = `--- program.rkt
+++ program.rkt
@@ -1,1 +1,1 @@
-(define (f x) x)
+(define (f x) (+ x 1))
`;
  const patched = await applyPatch(original, diff);
  assert.equal(patched.trim(), "(define (f x) (+ x 1))");
});

test("applyPatch: a shorthand hunk header with omitted counts applies", async () => {
  const diff = `--- program.rkt
+++ program.rkt
@@ -1 +1 @@
-(define (f x) x)
+(define (f x) (+ x 1))
`;
  const patched = await applyPatch("(define (f x) x)", diff);
  assert.equal(patched.trim(), "(define (f x) (+ x 1))");
});

test("runOne: a diff arm applies a valid nested diff and scores it", async () => {
  const task: Task = {
    id: "t13-wrap-let",
    locate: "described",
    construct: "build",
    instruction: "wrap",
    input: nestedInput,
    expected: nestedExpected,
  };
  const result = await runOne(diffDriver(nestedDiff), diffArm, task);
  assert.equal(result.hunkFailure, false);
  assert.equal(result.parsed, true);
  assert.equal(result.success, true);
  assert.equal(result.finalArtifact.trim(), nestedExpected);
});

test("runOne: a non-applying diff is a hunk failure, not a parse error", async () => {
  const task: Task = {
    id: "t13-wrap-let",
    locate: "described",
    construct: "build",
    instruction: "wrap",
    input: nestedInput,
    expected: nestedExpected,
  };
  const bad = `--- program.rkt
+++ program.rkt
@@ -1,1 +1,1 @@
-(nonexistent line)
+(something)
`;
  const result = await runOne(diffDriver(bad), diffArm, task);
  assert.equal(result.hunkFailure, true);
  assert.equal(result.parsed, false);
  assert.match(result.parseError ?? "", /diff apply failed/);
});
