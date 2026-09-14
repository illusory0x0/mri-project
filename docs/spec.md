Status: ready-for-agent

# lisp-editor — stateless structural editor for a Lisp subset

## Problem Statement

An AI agent editing Lisp/Racket source with ordinary text tools (whole-file
text-diff rewrites, `sed`, `awk`) frequently produces bracket mismatches,
especially once expressions nest deeply. Text edits operate on
characters, not structure, so one misplaced parenthesis silently corrupts the
whole program and the agent has no structural handle on "the node I mean". The
agent spends effort counting parens instead of expressing intent.

## Solution

`lisp-editor` is a stateless command-line **structure editor** for a small Lisp
subset. It reads source on stdin, parses it into an s-expression AST, and applies
exactly one `(path, node)` edit per invocation, printing the resulting source on
stdout. Nodes are addressed by an index path (e.g. `[1,2,3]`), construction uses
named shape skeletons whose unspecified children are holes, and concrete atoms
are produced by parameterized atom shapes. Because every edit re-serializes the
AST through a deterministic printer, the emitted source is always well-formed —
the agent never balances brackets around deep nesting. An `outline` command
exposes the tree's paths so the agent can choose where to edit.

A four-arm experiment (whole-file rewrite vs. `lisp-editor` vs. `sed`/`awk` vs.
unified diff) on deeply nested tasks tests the hypothesis that structural
editing lets an agent edit with less effort and greater expressiveness than text
manipulation. Bracket safety is not the headline: the `ast-edit` arm cannot
produce a bracket mismatch by construction, so it is reported as a separate
reliability cell.

## User Stories

1. As an AI agent editing deeply nested Lisp, I want to target a node by its
   path, so that I can change exactly that expression without touching its
   surroundings.
2. As an AI agent, I want to discover the tree's structure and node paths before
   editing, so that I can pick the correct target instead of guessing from text.
3. As an AI agent, I want to replace a node with a named shape skeleton, so that
   I can build common forms (lambda, if, define, let, apply) without writing
   brackets.
4. As an AI agent, I want shape skeletons to contain named holes, so that I can
   see what is still missing and fill it with a later edit.
5. As an AI agent, I want to produce concrete atoms (variable, number, string),
   so that I can populate the leaves of a program.
6. As an AI agent, I want to copy an existing subtree from one path to another,
   so that I can reuse or move structure without retyping it.
7. As an AI agent, I want to replace a node with a hole, so that a position that
   must stay visible but unfilled becomes an explicit placeholder.
8. As an AI agent, I want to insert a form into an empty file, so that a freshly
   created file becomes editable.
9. As an AI agent, I want a failed edit to leave the source completely unchanged,
   so that I can safely retry after an error.
10. As an AI agent, I want clear error output when a path is invalid or out of
    range, so that I can correct my request without corrupting state.
11. As an AI agent, I want the full resulting source printed after each edit, so
    that I can observe state and plan the next action.
12. As an AI agent, I want to compose complex expressions from shapes and atoms,
    so that I can write arbitrary programs without a free-text escape hatch.
13. As a tool author, I want a parser for the supported Lisp subset, so that
    source becomes an AST I can navigate and mutate.
14. As a tool author, I want the parser to reject malformed input with a clear
    error, so that invalid source cannot enter the editor.
15. As a tool author, I want a deterministic pretty-printer, so that the same AST
    always serializes to the same text and paths stay reproducible.
16. As a tool author, I want comments and whitespace to be discarded, so that the
    AST model stays simple.
17. As a tool author, I want quote/quasiquote and macros excluded, so that the
    tool edits code without becoming an interpreter or expanding macros.
18. As a tool author, I want no type or scope checking, so that the tool stays a
    pure syntactic structure editor.
19. As a tool author, I want holes to be `_`-prefixed identifiers by convention
    only, so that naming implies intent without requiring a validator.
20. As a tool author, I want a single CLI entry point named `lisp-editor`, so
    that agents and humans invoke one tool consistently.
21. As a tool author, I want the root addressed as the empty path `[]`, so that
    whole-file operations are expressible.
22. As a tool author, I want integer-indexed child paths, so that addressing is
    predictable across edits.
23. As an experimenter, I want a fixed task set of deeply nested edits, so
    that the nesting-depth hypothesis is exercised directly.
24. As an experimenter, I want the same model, prompt, and temperature across
    arms, so that the only variable is the editing interface.
25. As an experimenter, I want to measure parse-error and bracket-mismatch rates
    as a separate reliability cell, so that the bracket-safety claim stays
    falsifiable without being the headline.
26. As an experimenter, I want success split into structural equality (same
    program) and semantic equivalence (same probe result), so that a
    non-canonical but equivalent answer is not scored as a failure.
27. As an experimenter, I want to measure steps and tokens, so that the effort
    claim is quantified.
28. As an experimenter, I want Racket used only for parsing and evaluating
    results during scoring, so that the product has no Racket runtime dependency.
29. As an experimenter, I want per-task, per-arm result artifacts, so
    that runs are reproducible and inspectable.
30. As an AI agent, I want to delete a node by splicing it out of its parent
    list, so that a list shrinks and stays well-formed.
31. As an AI agent, I want to insert a new node at a chosen index in a list, so
    that I can add a binding, an argument, or a top-level form.

## Implementation Decisions

**Language and dependency posture.** Implemented in TypeScript. Pure TypeScript
s-expression parser; no native parser dependency (no tree-sitter). No runtime
dependencies. Racket is used only inside the experiment harness.

**AST model.** A homogeneous s-expression tree: a node is either an `atom` or a
`list` of nodes. Comments and whitespace are discarded at parse time. Quote and
quasiquote are excluded (the tool edits code; it is not an interpreter and does
not do metaprogramming). There is no type or scope checking; it is a purely
syntactic editor (ADR 0007).

**Holes.** A hole is any identifier beginning with `_`. Holes are a naming
convention only — nothing validates or tracks them. Shape skeletons are emitted
with named holes (e.g. `_param`, `_body`) for readability. A hole marks a
position that is visible but not yet filled; it is not a deletion. Deleting is a
separate `delete` operation (see Commands). `outline` surfaces holes as their own
kind (`kind: "hole"`), distinct from ordinary symbols.

**Addressing.** A path is an array of child indices serialized as JSON, e.g.
`[1,2,3]`. The root is the program: a list whose children are the top-level
forms. The empty path `[]` addresses the whole program, and its children are
addressed `[0]`, `[1]`, … . Paths are resolved against the current AST; because
the printer is deterministic, paths for a given state are reproducible. The root
is a container: a new top-level form is added with `insert … --into []`.

**Interaction model.** Fully stateless. Source is read from stdin and the
resulting source is written to stdout; an optional `--file` flag reads a file
instead of stdin. `--in`, `--out`, and `--into` are **AST paths**, and `--at` is
a child index, not filesystem paths. No session, no cursor, no `finish` step, no
`select` step: the path is supplied on each invocation.

**Commands.**
- `lisp-editor outline` — prints the tree as JSON, one entry per node.
  `kind` is the semantic construct: `"define"`, `"lambda"`, `"let"`, `"let*"`,
  `"if"`, `"cond"` for special forms; `"apply"` (with a `head` field naming the
  operator) for function calls; `"list"` for skeletons and data lists whose head
  is a hole or non-symbol; `"symbol"`, `"number"`, `"string"`, or `"hole"`
  (with a `value` field) for atoms.
- `lisp-editor replace <shape> --out <astpath>` — replaces the node at
  `<astpath>` with the shape's skeleton; unspecified children are holes.
- `lisp-editor replace --in <astpath> --out <astpath>` — copies the node at
  `--in` and overwrites the node at `--out` with it.
- `lisp-editor delete --out <astpath>` — removes the node at `<astpath>` from its
  parent list. Deleting the root is an error; the parent must be a list.
- `lisp-editor insert <shape> --into <astpath> --at <index>` — inserts the
  shape's node into the list at `<astpath>` before child `<index>`; `<index>` may
  equal the list's length (append). Bootstrapping an empty file is
  `insert <shape> --into [] --at 0`.
- `lisp-editor insert --in <srcpath> --into <astpath> --at <index>` — copies the
  node at `--in` into the list at `<astpath>` before child `<index>`.

**Shape catalogue (v2).**
- `lambda` → `(lambda (_param) _body)`
- `if` → `(if _cond _then _else)`
- `define` → `(define _name _body)`
- `define-fn` → `(define (_name _param) _body)`, a function header
- `let` → `(let ((_name _value)) _body)`
- `let*` → `(let* ((_name _value)) _body)`
- `cond` → `(cond (_test1 _body1) (_test2 _body2))`
- `list` → `(_item1 _item2)`, a general two-element list of holes
- `apply:<n>` → `(_func _arg1 ... _argn)`, e.g. `apply:2` → `(_func _arg1 _arg2)`
- `hole` → a bare `_` placeholder (named holes appear in the skeletons above)
- parameterized atoms: `var:<name>` → `<name>`, `num:<n>` → `<n>`,
  `str:<s>` → `"<s>"`

There is no free-text `--text` mode in v2; arbitrary expressions are composed
from shapes and atoms. There is also no atomic `wrap`/transform verb: `replace`
discards the node at `--out`, so wrapping a node in a new form requires copying
it out first (`replace --in <path> --out <tmp>`), or rebuilding the form around
it, before overwriting `<path>`. The vocabulary stays one node per call, at the
cost of extra steps on wrap tasks.

**Supported subset.** `define`, `lambda`, `let`, `let*`, `if`, `cond`,
variables, application, numbers, strings, and symbols — enough to write simple
algorithms and simple file-reading programs. No macros, no `require`, no
quote/quasiquote (ADR 0007).

**Error and atomicity semantics.** Any invalid request (malformed input,
unresolvable path, out-of-range index, deleting the root, inserting into a
non-list, unknown shape) produces an error and leaves the source unchanged;
nothing is written. This makes every edit safely retryable.

**Module decomposition.**
- parser: stdin text → AST, with clear errors for malformed input.
- printer: AST → canonical text; deterministic; this is the only place text is
  produced for the editor.
- ops: path resolution, shape expansion, atom construction, subtree copy,
  structural delete, and insert.
- cli: argument parsing, stdin/stdout plumbing, `outline`, `replace`, `delete`,
  and `insert` dispatch.

The command is exposed as the `lisp-editor` bin.

**Experiment harness.** A four-arm harness lives alongside the tool:
- tasks: a fixed set of nested edit tasks, each with input source, instruction,
  expected result, and two annotations: `locate` (`explicit` | `described`) and
  `construct` (`atom` | `wrap` | `build` | `copy` | `multi`). A task may also
  carry an optional `semantic` probe: an expression evaluated against both the
  candidate and the expected program. The harness also computes each task's
  target depth — the depth of the first divergence between input and expected,
  reported at the containing list's depth when an insert or delete changes a
  list's child count — and records it as report metadata; depth is not an
  experimental factor.
- arms: `direct` (agent outputs whole-file text), `ast-edit` (agent drives
  `lisp-editor`), `text-edit` (agent uses shell/`sed`/`awk`), `diff` (agent
  replies with a unified diff that the harness applies).
- runner: for each `(task × arm)`, runs the agent with the arm's
  prompt/tools, captures the transcript and final artifact, and scores it.
- scoring: two independent verdicts per run. **Structural** — candidate and
  expected parse to the same datum sequence. **Semantic** — a task-declared
  probe evaluates to the same result for both, wherever a probe exists.
  Evaluation is bounded to a reasonable step budget; if either side does not
  terminate within it, the verdict is `unknown` and is excluded from the
  semantic denominator. These two verdicts are the reported headline. The
  harness additionally records a single boolean `success` (structurally equal
  **and** evaluates) as an internal gate; it is not itself the headline verdict,
  and a semantically equivalent but non-canonical answer is not a failure.
- results: per-run JSON plus a summary table.

Racket appears only in task fixtures and the scorer (parse + execute to verify
the result), never in the product.

## Testing Decisions

**What makes a good test here.** Tests assert external behavior only: given a
source on stdin and a command line, assert stdout and exit status. Tests never
reach into internal functions or assert on the AST data structures directly.

**The single seam.** One seam only: the `lisp-editor` CLI process boundary. Each
test spawns (or invokes) the command with source plus arguments and asserts the
resulting stdout / error. This one seam exercises parser, printer, ops, path
resolution, shape expansion, and error semantics together, so no internal module
seam is introduced. The ideal-diagnostic property is preserved by keeping the
surface small.

**Modules covered transitively.** parser, printer, ops, and cli are all covered
through the CLI seam; none gets a separate unit-test seam.

**Round-trip and invariants.** Round-tripping (`parse → print`) and
"printer output is always parseable" are verified through the CLI, not as
separate internal tests.

**Prior art.** None — this is a greenfield repository. These CLI-level
integration tests establish the pattern future work should follow.

## Out of Scope

- Type checking, scope checking, typed holes, and Hazelnut-style cursor/zipper
  calculus semantics.
- Stateful sessions, cursors, `select`, and `finish`.
- Comment and whitespace preservation (comments are discarded).
- Free-text `--text` payloads.
- Macros, `require`, quote/quasiquote, and macro expansion.
- General semantic equivalence of arbitrary programs (undecidable). Only a
  task-declared probe is compared, and a side that does not terminate within the
  step budget is reported as `unknown`.
- An MCP adapter (possible later; the CLI is the contract).
- GitHub/remote issue publishing (local-markdown tracker is used for now).

## Further Notes

- **Relationship to Hazelnut.** The edit-action vocabulary is inspired by
  "Hazelnut: A Bidirectionally Typed Structure Editor Calculus" (Omar et al.,
  POPL 2017), but this tool deliberately diverges: it is untyped, has no cursor
  calculus, and replaces the paper's stateful navigational actions with a
  stateless path-based `(path, node)` edit. The dependency/blocking vocabulary is
  not borrowed, only the underlying idea that structure-preserving edits prevent
  malformed programs.
- **The headline metric is effort and expressiveness, not bracket safety.**
  Because all construction goes through shapes and parameterized atoms and all
  output goes through the deterministic printer, the `ast-edit` arm has
  essentially zero bracket mismatches by construction. Rather than claim a
  victory there, the experiment takes the primary claim to be step/token cost
  and success (is the vocabulary expressive enough to reach the expected
  program?), and reports bracket mismatch as a separate reliability cell over a
  few deliberately bracket-dangerous tasks.
- **Reliability cell.** The bracket-danger cell now retains the original
  multi-line tasks and adds nesting- and size-driven ones; the first real-model
  run produced a genuine bracket mismatch for the `diff` arm on the deepest
  task. The cell's parse-error and bracket-mismatch rates are summarized
  separately from the headline (which excludes the cell's tasks). Tasks still
  mix reference-resolution difficulty with construction difficulty, which
  confounds the effort comparison.
- **Delete, insert, and bootstrap are implemented.** `delete` splices a node
  out of its parent list and `insert` places a node at a chosen index (the root
  is the program's list of top-level forms, so inserting into the root adds a
  top-level form and bootstraps an empty program).
- **Vocabulary v2 adopted.** The first real-model runs showed `outline`
  classified `cond`, `let*`, and plain `list` nodes that no shape could
  construct, that `define` could not build a function header, and that wrapping a
  compound body was expensive. v2 adds `cond`, `let*`, `list`, and `define-fn`
  shapes. An atomic `wrap`/transform verb was weighed against the one-node-per-
  call model and rejected for now: v2 keeps the model and documents the
  copy-before-overwrite order instead (see the shape catalogue). A `just eval`
  re-run to compare cost and expressiveness against v1 is still pending.
- **Deferred: cost by construct.** The summary reports a single step/token figure
  per arm, which averages `atom` tasks (≈2 steps) with `build` tasks (≈12 steps)
  and hides where the vocabulary is expensive. Splitting the cost summary by
  `construct` is deliberately deferred to a future decision; the evidence is
  recorded in the shape-vocabulary ticket above.
- **Future direction: a custom benchmark language.** A more stable benchmark
  would replace Racket with a purpose-built, Lisp-style ML language whose syntax
  and evaluation are fully specified, so scoring no longer depends on Racket's
  reader. This is deliberately low-priority: the cost is high (agents are
  unfamiliar with a new language, and teaching it in the system prompt consumes
  tokens), so it is recorded as a direction, not committed work.
