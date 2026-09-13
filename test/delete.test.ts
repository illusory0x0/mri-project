import assert from "node:assert/strict";
import { test } from "node:test";
import { ok, run } from "./helpers.js";

// --- Ticket 12: delete a node by splicing it out of its parent list ---

test("delete: removes a binding from a let without leaving a hole", () => {
  assert.equal(
    ok("(let ((a 1) (b 2) (c 3)) (+ a c))", ["delete", "--out", "[0,1,1]"]),
    "(let ((a 1) (c 3)) (+ a c))\n"
  );
});

test("delete: removes an argument from a call", () => {
  assert.equal(
    ok("(f a b c)", ["delete", "--out", "[0,2]"]),
    "(f a c)\n"
  );
});

test("delete: deletes a top-level form from the root", () => {
  assert.equal(
    ok("(a)\n(b)\n(c)", ["delete", "--out", "[1]"]),
    "(a)\n(c)\n"
  );
});

test("delete: deleting the root fails and leaves the source unchanged", () => {
  const result = run("(a b)", ["delete", "--out", "[]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /root/);
});

test("delete: a parent that is not a list fails and leaves the source unchanged", () => {
  const result = run("(a b)", ["delete", "--out", "[0,0,0]"]); // [0,0] is the atom a
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});

test("delete: an out-of-range path fails and leaves the source unchanged", () => {
  const result = run("(a b)", ["delete", "--out", "[9]"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /out of range/);
});

test("delete: requires --out", () => {
  const result = run("(a b)", ["delete"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});

test("delete: output is well-formed and re-parses", () => {
  const deleted = ok("(a (b c) d)", ["delete", "--out", "[0,1]"]);
  assert.equal(deleted, "(a d)\n");
  assert.equal(run(deleted, ["outline"]).code, 0);
});
