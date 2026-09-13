import assert from "node:assert/strict";
import { test } from "node:test";
import { ok, run } from "./helpers.js";

// --- Ticket 13: insert a node into a list at a chosen index ---

test("insert: bootstraps an empty program with a single top-level datum", () => {
  assert.equal(
    ok("", ["insert", "define", "--into", "[]", "--at", "0"]),
    "(define _name _body)\n"
  );
});

test("insert: a define shape is one top-level form, not three datums", () => {
  const bootstrapped = ok("", ["insert", "define", "--into", "[]", "--at", "0"]);
  const outlined = run(bootstrapped, ["outline"]);
  assert.equal(outlined.code, 0);
  const nodes = JSON.parse(outlined.stdout) as Array<{ path: number[] }>;
  assert.deepEqual(
    nodes.map((node) => node.path),
    [
      [],
      [0],
      [0, 0],
      [0, 1],
      [0, 2],
    ]
  );
});

test("insert: a node at index i appears immediately before the child at i", () => {
  assert.equal(
    ok("(a c)", ["insert", "var:b", "--into", "[0]", "--at", "1"]),
    "(a b c)\n"
  );
});

test("insert: --at equal to the list length appends", () => {
  assert.equal(
    ok("(f a)", ["insert", "var:b", "--into", "[0]", "--at", "2"]),
    "(f a b)\n"
  );
});

test("insert: --in copies the subtree at the source path", () => {
  assert.equal(
    ok("(a (b c))", ["insert", "--in", "[0,1]", "--into", "[]", "--at", "0"]),
    "(b c)\n(a (b c))\n"
  );
});

test("insert: into the root of a non-empty program appends a top-level form", () => {
  assert.equal(
    ok("a", ["insert", "var:b", "--into", "[]", "--at", "1"]),
    "a\nb\n"
  );
});

test("insert: into a nested list places the node before the given child", () => {
  assert.equal(
    ok("(f a c)", ["insert", "var:b", "--into", "[0]", "--at", "2"]),
    "(f a b c)\n"
  );
});

test("insert: inserting into a non-list fails and leaves the source unchanged", () => {
  const result = run("(a b)", ["insert", "var:x", "--into", "[0,0]", "--at", "0"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});

test("insert: an --at outside the valid range fails and leaves the source unchanged", () => {
  const result = run("(a b)", ["insert", "var:x", "--into", "[0]", "--at", "5"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /out of range/);
});

test("insert: requires --into and --at", () => {
  assert.equal(run("(a)", ["insert", "var:x", "--at", "0"]).code, 1);
  assert.equal(run("(a)", ["insert", "var:x", "--into", "[0]"]).code, 1);
});

test("insert: cannot combine --in with a shape", () => {
  const result = run("(a)", ["insert", "--in", "[0]", "var:x", "--into", "[0]", "--at", "0"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
});
