import assert from "node:assert/strict";
import { test } from "node:test";
import { ok, run } from "./helpers.js";

// --- Ticket 02: shape skeletons and canonical printing ---

test("replace: lambda skeleton at a form path", () => {
  assert.equal(
    ok("(foo)", ["replace", "lambda", "--out", "[0]"]),
    "(lambda (_param) _body)\n"
  );
});

test("replace: every v1 shape produces its skeleton", () => {
  assert.equal(ok("(a)", ["replace", "if", "--out", "[0]"]), "(if _cond _then _else)\n");
  assert.equal(ok("(a)", ["replace", "define", "--out", "[0]"]), "(define _name _body)\n");
  assert.equal(ok("(a)", ["replace", "let", "--out", "[0]"]), "(let ((_name _value)) _body)\n");
  assert.equal(ok("(a)", ["replace", "apply", "--out", "[0]"]), "(_func _args)\n");
  assert.equal(ok("(a)", ["replace", "hole", "--out", "[0]"]), "_\n");
});

test("replace: output is deterministic and re-parses", () => {
  const first = ok("(foo bar baz)", ["replace", "lambda", "--out", "[0]"]);
  const second = ok("(foo bar baz)", ["replace", "lambda", "--out", "[0]"]);
  assert.equal(first, second);
  const reparsed = run(first, ["outline"]);
  assert.equal(reparsed.code, 0, reparsed.stderr);
});

test("replace: invalid path fails atomically", () => {
  const result = run("(foo)", ["replace", "lambda", "--out", "[9]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /out of range/);
});

test("replace: unknown shape fails atomically", () => {
  const result = run("(foo)", ["replace", "bogus", "--out", "[0]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unknown shape/);
});

// --- Ticket 03: parameterized atoms ---

test("replace: variable atom", () => {
  assert.equal(ok("(a)", ["replace", "var:x", "--out", "[0,0]"]), "(x)\n");
});

test("replace: number atom", () => {
  assert.equal(ok("(a)", ["replace", "num:42", "--out", "[0,0]"]), "(42)\n");
  assert.equal(ok("(a)", ["replace", "num:-1.5", "--out", "[0,0]"]), "(-1.5)\n");
});

test("replace: string atom round-trips with spaces and quotes", () => {
  assert.equal(
    ok("(a)", ["replace", "str:hello world", "--out", "[0,0]"]),
    '("hello world")\n'
  );
  const quoted = ok("(a)", ["replace", 'str:a"b', "--out", "[0,0]"]);
  assert.equal(quoted, '("a\\"b")\n');
  const reparsed = run(quoted, ["outline"]);
  assert.equal(reparsed.code, 0, reparsed.stderr);
});

test("replace: invalid number fails atomically", () => {
  const result = run("(a)", ["replace", "num:abc", "--out", "[0,0]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});

test("replace: variable payloads that would corrupt source are rejected", () => {
  for (const spec of ["var:a b", "var:f(x)", 'var:a"b', "var:42", "var:"]) {
    const result = run("(a)", ["replace", spec, "--out", "[0,0]"]);
    assert.equal(result.code, 1, `expected ${spec} to fail`);
    assert.equal(result.stdout, "", `expected no output for ${spec}`);
  }
});

// --- Ticket 04: copy a subtree ---

test("replace --in/--out: copies a subtree", () => {
  assert.equal(
    ok("(a (b c))", ["replace", "--in", "[0,0]", "--out", "[0,1,0]"]),
    "(a (a c))\n"
  );
});

test("replace --in/--out: copy is independent of the original", () => {
  const copied = ok("((x y) z)", ["replace", "--in", "[0,0]", "--out", "[0,1]"]);
  assert.equal(copied, "((x y) (x y))\n");
  const edited = ok(copied, ["replace", "var:q", "--out", "[0,1,0]"]);
  assert.equal(edited, "((x y) (q y))\n");
});

test("replace --in/--out: invalid source path fails atomically", () => {
  const result = run("(a)", ["replace", "--in", "[9]", "--out", "[0]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});

// --- Ticket 05: delete via hole and bootstrap ---

test("replace hole: deletes the node by replacing it with a hole", () => {
  assert.equal(ok("(a b)", ["replace", "hole", "--out", "[0,0]"]), "(_ b)\n");
});

test("replace hole: bootstraps an empty file at the root", () => {
  assert.equal(ok("", ["replace", "hole", "--out", "[]"]), "_\n");
});

test("replace --in at root: replaces the whole program", () => {
  assert.equal(ok("(a)", ["replace", "--in", "[0,0]", "--out", "[]"]), "a\n");
});

test("replace hole: invalid path fails atomically", () => {
  const result = run("(a)", ["replace", "hole", "--out", "[5]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});
