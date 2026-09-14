# The structural editor

## Scope

`lisp-editor` is a stateless, untyped, purely syntactic structure editor for a
Lisp subset. It has no evaluator and takes on no semantic responsibility of any
kind: no type checking, no scope resolution, no macro expansion (ADR 0007).

## Language and dependency posture

Implemented in TypeScript. A pure TypeScript s-expression parser; no native
parser dependency (no tree-sitter). No runtime dependencies. Racket is used only
inside the experiment harness (ADR 0006).

## AST model

A homogeneous s-expression tree of **Atom** and **List** nodes (both defined in
[`CONTEXT.md`](../../CONTEXT.md)). Comments and whitespace are discarded at
parse time. There is no type or scope checking.

Reader forms:

- `'<datum>` (including the shorthand before a list) is normalized on parse to the
  list `(quote <datum>)`. A quoted datum is an ordinary list node; it prints
  canonically as `(quote x)`, and Racket reads `'x` and `(quote x)` to the same
  datum, so the scorer's structural comparison still matches.
- Booleans (`#t` / `#f`) and characters (`#\a`, `#\space`, `#\(`) are **Atom**
  kinds.
- Backquote `` ` `` and unquote `,` / `,@` are rejected at parse.
- Macro forms such as `(define-syntax …)` parse as ordinary lists the tool is
  indifferent to.

Widening the reader for the real-Racket corpus is recorded in ADR 0011, which
amends ADR 0007.

## Holes

A hole is any identifier beginning with `_`. Holes are a naming convention only —
nothing validates or tracks them. Shape skeletons are emitted with named holes
(e.g. `_param`, `_body`) for readability. A hole marks a position that is visible
but not yet filled; it is not a deletion. Deleting is a separate `delete`
operation (see Commands). `outline` surfaces holes as their own kind
(`kind: "hole"`), distinct from ordinary symbols.

## Addressing

A path is an array of child indices serialized as JSON, e.g. `[1,2,3]`. The root
is the program: a list whose children are the top-level forms. The empty path `[]`
addresses the whole program, and its children are addressed `[0]`, `[1]`, … .
Paths are resolved against the current AST; because the printer is deterministic,
paths for a given state are reproducible. The root is a container: a new top-level
form is added with `insert … --into []`.

## Interaction model

Fully stateless. Source is read from stdin and the resulting source is written to
stdout; an optional `--file` flag reads a file instead of stdin. `--in`, `--out`,
and `--into` are **AST paths**, and `--at` is a child index, not filesystem paths.
No session, no cursor, no `finish` step, no `select` step: the path is supplied on
each invocation.

## Commands

- `lisp-editor outline` — prints the tree as JSON, one entry per node.
- `lisp-editor replace <shape> --out <astpath>` — replaces the node at `<astpath>`
  with the shape's skeleton; unspecified children are holes.
- `lisp-editor replace --in <astpath> --out <astpath>` — copies the node at
  `--in` and overwrites the node at `--out` with it.
- `lisp-editor delete --out <astpath>` — removes the node at `<astpath>` from its
  parent list. Deleting the root is an error; the parent must be a list.
- `lisp-editor insert <shape> --into <astpath> --at <index>` — inserts the shape's
  node into the list at `<astpath>` before child `<index>`; `<index>` may equal the
  list's length (append). Bootstrapping an empty file is
  `insert <shape> --into [] --at 0`.
- `lisp-editor insert --in <srcpath> --into <astpath> --at <index>` — copies the
  node at `--in` into the list at `<astpath>` before child `<index>`.

## Outline kinds

`outline` reports a `kind` for every node:

- Special forms get their own kind: `define`, `lambda`, `let`, `let*`, `if`,
  `cond`, `quote`. A named `let` is also `kind: "let"`.
- Any other list whose head is a non-hole symbol is `kind: "apply"` with a `head`
  field naming the operator. This includes forms that have a shape but no outline
  kind of their own, such as `letrec`, `and`, `or`, `when`, `unless`, and `begin`.
- A list whose head is a hole or non-symbol is `kind: "list"`, the skeleton /
  data-list case.
- Atoms are `kind: "symbol"`, `"number"`, `"string"`, `"boolean"`, or
  `"character"`, and holes are `kind: "hole"`, each with a `value` field.

## Shape catalogue (v3)

- `lambda` → `(lambda (_param) _body)`
- `if` → `(if _cond _then _else)`
- `define` → `(define _name _body)`
- `define-fn` → `(define (_name _param) _body)`, a function header
- `let` → `(let ((_name _value)) _body)`
- `let*` → `(let* ((_name _value)) _body)`
- `letrec` → `(letrec ((_name _value)) _body)`
- `let-loop` → `(let _loop ((_name _value)) _body)`, a named `let`
- `cond` → `(cond (_test1 _body1) (_test2 _body2))`
- `and` → `(and _arg1 _arg2)`
- `or` → `(or _arg1 _arg2)`
- `when` → `(when _cond _body)`
- `unless` → `(unless _cond _body)`
- `begin` → `(begin _body1 _body2)`
- `list` → `(_item1 _item2)`, a general two-element list of holes
- `apply:<n>` → `(_func _arg1 ... _argn)`, e.g. `apply:2` → `(_func _arg1 _arg2)`
- `hole` → a bare `_` placeholder (named holes appear in the skeletons above)
- parameterized atoms: `var:<name>` → `<name>`, `num:<n>` → `<n>`,
  `str:<s>` → `"<s>"`

`match` and `for/*` get no shape: they parse, copy, move, insert, and delete like
any other list, but cannot be constructed from a skeleton.

There is no free-text `--text` mode and no atomic `wrap`/transform verb. `replace`
discards the node at `--out`, so wrapping a node in a new form requires copying it
out first (`replace --in <path> --out <tmp>`), or rebuilding the form around it,
before overwriting `<path>`. The vocabulary stays one node per call, at the cost
of extra steps on wrap tasks.

## Supported subset

`define`, `lambda`, `let`, `let*`, `letrec`, `if`, `cond`, `and`, `or`, `when`,
`unless`, `begin`, named `let`, application, and atoms (symbol, number, string,
boolean, character, quoted datum) — enough to edit simple algorithms and the
selected real-Racket corpus files.

Excluded: modules (`require` / `provide`), `struct` / `class`, macros
(`define-syntax`), continuations (`shift` / `reset`, `let/cc`), vector and hash
literals, and backquote / unquote (ADR 0011).

## Error and atomicity semantics

Any invalid request (malformed input, unresolvable path, out-of-range index,
deleting the root, inserting into a non-list, unknown shape) produces an error and
leaves the source unchanged; nothing is written. This makes every edit safely
retryable.

## Module decomposition

- parser: stdin text → AST, with clear errors for malformed input.
- printer: AST → canonical text; deterministic; this is the only place text is
  produced for the editor.
- ops: path resolution, shape expansion, atom construction, subtree copy, and the
  structural delete and insert.
- cli: argument parsing, stdin/stdout plumbing, and `outline` / `replace` /
  `delete` / `insert` dispatch.

The command is exposed as the `lisp-editor` bin.

## User Stories

1. As an AI agent editing deeply nested Lisp, I want to target a node by its path,
   so that I can change exactly that expression without touching its surroundings.
2. As an AI agent, I want to discover the tree's structure and node paths before
   editing, so that I can pick the correct target instead of guessing from text.
3. As an AI agent, I want to replace a node with a named shape skeleton, so that I
   can build common forms without writing brackets.
4. As an AI agent, I want shape skeletons to contain named holes, so that I can
   see what is still missing and fill it with a later edit.
5. As an AI agent, I want to produce concrete atoms (variable, number, string,
   boolean, character), so that I can populate the leaves of a program.
6. As an AI agent, I want to copy an existing subtree from one path to another, so
   that I can reuse or move structure without retyping it.
7. As an AI agent, I want to replace a node with a hole, so that a position that
   must stay visible but unfilled becomes an explicit placeholder.
8. As an AI agent, I want to insert a form into an empty file, so that a freshly
   created file becomes editable.
9. As an AI agent, I want to delete a node by splicing it out of its parent list,
   so that a list shrinks and stays well-formed.
10. As an AI agent, I want to insert a new node at a chosen index in a list, so
    that I can add a binding, an argument, or a top-level form.
11. As an AI agent, I want a failed edit to leave the source completely unchanged,
    so that I can safely retry after an error.
12. As an AI agent, I want clear error output when a path is invalid or out of
    range, so that I can correct my request without corrupting state.
13. As an AI agent, I want the full resulting source printed after each edit, so
    that I can observe state and plan the next action.
14. As an AI agent, I want to compose complex expressions from shapes and atoms,
    so that I can write arbitrary programs without a free-text escape hatch.
15. As an AI agent editing real Racket, I want quote, booleans, and characters to
    be first-class, so that I can edit corpus programs, not just a toy subset.
16. As a tool author, I want a parser for the supported Lisp subset, so that
    source becomes an AST I can navigate and mutate.
17. As a tool author, I want the parser to reject malformed input with a clear
    error, so that invalid source cannot enter the editor.
18. As a tool author, I want a deterministic pretty-printer, so that the same AST
    always serializes to the same text and paths stay reproducible.
19. As a tool author, I want comments and whitespace to be discarded, so that the
    AST model stays simple.
20. As a tool author, I want no type or scope checking, so that the tool stays a
    pure syntactic structure editor.
21. As a tool author, I want holes to be `_`-prefixed identifiers by convention
    only, so that naming implies intent without requiring a validator.
22. As a tool author, I want a single CLI entry point named `lisp-editor`, so that
    agents and humans invoke one tool consistently.
23. As a tool author, I want the root addressed as the empty path `[]`, so that
    whole-file operations are expressible.
24. As a tool author, I want integer-indexed child paths, so that addressing is
    predictable across edits.

## Testing Decisions

**What makes a good test here.** Tests assert external behavior only: given a
source on stdin and a command line, assert stdout and exit status. Tests never
reach into internal functions or assert on the AST data structures directly.

**The seam.** One seam: the `lisp-editor` CLI process boundary. Each test spawns
the command with source plus arguments and asserts the resulting stdout / error.
This one seam exercises parser, printer, ops, path resolution, shape expansion,
and error semantics together.

**Coverage.** The parser, printer, ops, and cli are all covered through the CLI
seam; none gets a separate unit-test seam. Round-tripping (`parse → print`) and
"printer output is always parseable" are verified through the CLI. The golden
corpus additionally pins the scorer's structural verdict on a `(quote x)`
candidate against an `'x` expected program.

**Prior art.** The reader, replace, insert, delete, and outline tests are all
CLI-level integration tests and establish the pattern future work follows.

## Out of Scope

- Type checking, scope checking, typed holes, and Hazelnut-style cursor/zipper
  calculus semantics.
- Stateful sessions, cursors, `select`, and `finish`.
- Comment and whitespace preservation (comments are discarded).
- Free-text `--text` payloads.
- Macros, `require` / `provide`, `struct` / `class`, continuations, vector and
  hash literals, and backquote / unquote.
- An MCP adapter (possible later; the CLI is the contract).

## Further Notes

- **Relationship to Hazelnut.** The edit-action vocabulary is inspired by
  "Hazelnut: A Bidirectionally Typed Structure Editor Calculus" (Omar et al.,
  POPL 2017), but this tool deliberately diverges: it is untyped, has no cursor
  calculus, and replaces the paper's stateful navigational actions with a
  stateless path-based `(path, node)` edit (ADR 0005).
- **Vocabulary history.** v2 added `cond`, `let*`, `list`, and `define-fn`
  because `outline` classified forms no shape could construct and wrapping a
  compound body had no atomic verb. v3 adds `letrec`, `and`, `or`, `when`,
  `unless`, `begin`, and a named `let` for the real-Racket corpus (ADR 0011). An
  atomic `wrap`/transform verb was weighed against the one-node-per-call model and
  rejected both times; the copy-before-overwrite order is documented instead.
- **Outline kinds lag shapes.** A form can gain a shape without gaining an
  `outline` kind; `letrec`, `and`, `or`, `when`, `unless`, and `begin` are
  classified as `apply` today. That is consistent with the rule above, not a
  claim that they are function calls.
