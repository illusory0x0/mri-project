# lisp-editor — spec index

`lisp-editor` is a stateless structural editor for a Lisp subset, and the
experiment that tests whether editing a program through its structure is more
reliable and cheaper than editing its text.

## Problem Statement

An AI agent editing Lisp/Racket source with ordinary text tools (whole-file
text-diff rewrites, `sed`, `awk`) frequently produces bracket mismatches,
especially once expressions nest deeply. Text edits operate on characters, not
structure, so one misplaced parenthesis silently corrupts the whole program and
the agent has no structural handle on "the node I mean". The agent spends effort
counting parens instead of expressing intent.

## Solution

`lisp-editor` reads source on stdin, parses it into an s-expression AST, and
applies exactly one `(path, node)` edit per invocation, printing the resulting
source on stdout. Nodes are addressed by an index path, construction uses named
shape skeletons whose unspecified children are holes, and concrete atoms are
produced by parameterized atom shapes. Because every edit re-serializes the AST
through a deterministic printer, the emitted source is always well-formed.

A four-arm experiment (whole-file rewrite vs. `lisp-editor` vs. `sed`/`awk` vs.
unified diff) scores those edits. It runs three task sets — Basic, Orthogonal,
and LeetCode — in one run by default, and can repeat each task × arm N times to
measure stability.

## Spec map

- [editor.md](./editor.md) — the structural editor: language subset, AST,
  addressing, commands, shapes, errors, and the CLI.
- [harness.md](./harness.md) — the experiment harness: arms, runner, scorer,
  repeats and stability, reports, and snapshots.
- [tasks.md](./tasks.md) — the Task model, the task sets, corpus-derived tasks,
  and task selection.
- [findings.md](./findings.md) — what the runs have shown, and directions not
  taken.

Vocabulary is defined in [`CONTEXT.md`](../../CONTEXT.md); decisions are recorded
under [`docs/adr/`](../adr).
