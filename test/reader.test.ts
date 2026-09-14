import assert from "node:assert/strict";
import { test } from "node:test";
import { find, ok, outline, run } from "./helpers.js";

// --- Ticket 01: quote, booleans, and characters ---

test("reader: quote shorthand normalizes to a (quote …) list", () => {
  const entries = outline("'x");
  assert.equal(find(entries, [0])?.kind, "quote");
  assert.equal(find(entries, [0, 0])?.kind, "symbol");
  assert.equal(find(entries, [0, 0])?.value, "quote");
  assert.equal(find(entries, [0, 1])?.kind, "symbol");
  assert.equal(find(entries, [0, 1])?.value, "x");
});

test("reader: quote before a list wraps the whole list", () => {
  const entries = outline("'(a b)");
  assert.equal(find(entries, [0])?.kind, "quote");
  assert.equal(find(entries, [0, 1])?.kind, "apply");
  assert.equal(find(entries, [0, 1])?.head, "a");
});

test("reader: quote prints canonically and re-parses", () => {
  const printed = ok("'x", ["replace", "var:y", "--out", "[0,1]"]);
  assert.equal(printed, "(quote y)\n");
  const reparsed = run(printed, ["outline"]);
  assert.equal(reparsed.code, 0, reparsed.stderr);
});

test("reader: a quoted list is editable through its path", () => {
  assert.equal(
    ok("'(a b)", ["replace", "var:c", "--out", "[0,1,1]"]),
    "(quote (a c))\n"
  );
});

test("reader: nested quote nests the lists", () => {
  const entries = outline("''x");
  assert.equal(find(entries, [0])?.kind, "quote");
  assert.equal(find(entries, [0, 1])?.kind, "quote");
  assert.equal(find(entries, [0, 1, 1])?.value, "x");
});

test("reader: booleans are their own atom kind", () => {
  const entries = outline("#t");
  assert.equal(find(entries, [0])?.kind, "boolean");
  assert.equal(find(entries, [0])?.value, "#t");
  const falsy = outline("#f");
  assert.equal(find(falsy, [0])?.kind, "boolean");
  assert.equal(find(falsy, [0])?.value, "#f");
});

test("reader: booleans round-trip through the printer", () => {
  assert.equal(ok("(a #t)", ["replace", "var:z", "--out", "[0,0]"]), "(z #t)\n");
  assert.equal(ok("(a #f)", ["replace", "var:z", "--out", "[0,0]"]), "(z #f)\n");
});

test("reader: character literals are their own atom kind", () => {
  const entries = outline("#\\a");
  assert.equal(find(entries, [0])?.kind, "character");
  assert.equal(find(entries, [0])?.value, "#\\a");
});

test("reader: named character literals are read whole", () => {
  const entries = outline("#\\space");
  assert.equal(find(entries, [0])?.kind, "character");
  assert.equal(find(entries, [0])?.value, "#\\space");
});

test("reader: a delimiter character literal is not a paren", () => {
  const entries = outline("#\\(");
  assert.equal(find(entries, [0])?.kind, "character");
  assert.equal(find(entries, [0])?.value, "#\\(");
});

test("reader: characters round-trip through the printer", () => {
  assert.equal(ok("(a #\\a)", ["replace", "var:z", "--out", "[0,0]"]), "(z #\\a)\n");
});

test("reader: unquote is rejected", () => {
  const result = run(",x", ["outline"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /not supported/);
});

test("reader: a dangling quote is a parse error", () => {
  const result = run("'", ["outline"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unexpected end of input/);
});
