import assert from "node:assert/strict";
import { test } from "node:test";
import { find, outline, run } from "./helpers.js";

test("outline: classifies nodes by semantic kind", () => {
  const entries = outline("(define (f x) x)");
  assert.equal(find(entries, [])?.kind, "list");
  assert.equal(find(entries, [0])?.kind, "define");
  assert.equal(find(entries, [0, 0])?.kind, "symbol");
  assert.equal(find(entries, [0, 0])?.value, "define");
  assert.equal(find(entries, [0, 1])?.kind, "apply");
  assert.equal(find(entries, [0, 1])?.head, "f");
  assert.equal(find(entries, [0, 1, 0])?.value, "f");
  assert.equal(find(entries, [0, 2])?.kind, "symbol");
  assert.equal(find(entries, [0, 2])?.value, "x");
});

test("outline: lifts underscore identifiers to kind hole", () => {
  const entries = outline("(lambda (_param) _body)");
  assert.equal(find(entries, [0])?.kind, "lambda");
  assert.equal(find(entries, [0, 1])?.kind, "list");
  assert.equal(find(entries, [0, 1, 0])?.kind, "hole");
  assert.equal(find(entries, [0, 1, 0])?.value, "_param");
  assert.equal(find(entries, [0, 2])?.kind, "hole");
  assert.equal(find(entries, [0, 2])?.value, "_body");
  assert.equal(find(entries, [0, 0])?.kind, "symbol");
});

test("outline: accepts comments and discards them", () => {
  const entries = outline("; a comment\n(foo)\n");
  assert.equal(find(entries, [0])?.kind, "apply");
  assert.equal(find(entries, [0])?.head, "foo");
  assert.equal(entries.length, 3);
});

test("outline: accepts the supported subset forms", () => {
  const source = [
    "(define (f x)",
    "  (let ((y 1) (z 2))",
    "    (if (cond) y x)))",
    '(str "hi")',
  ].join("\n");
  const result = run(source, ["outline"]);
  assert.equal(result.code, 0, result.stderr);
});

test("outline: empty input yields only the root", () => {
  const entries = outline("");
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0].path, []);
});

test("parse error: unclosed paren exits non-zero with no stdout", () => {
  const result = run("(foo", ["outline"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unclosed/);
});

test("parse error: quote is rejected", () => {
  const result = run("'x", ["outline"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /not supported/);
});

test("outline: unknown option fails without output", () => {
  const result = run("(a)", ["outline", "--bogus"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});
