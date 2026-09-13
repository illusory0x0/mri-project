# 11: No structural delete, and root bootstrap is broken

**What to address:** Two capabilities promised by the user stories are not
actually available. Both block measuring `ast-edit` expressiveness.

**Blocked by:** none

**Status:** ready-for-agent (design settled 2026-09-14)

## Settled design

- **Structural delete.** Add `lisp-editor delete --out <astpath>`, which splices
  the node out of its parent list. Deleting the root is an error and the parent
  must be a list. A hole is now a placeholder only, not a deletion; rewrite user
  story 7 accordingly.
- **Insert.** Add `lisp-editor insert <shape> --into <astpath> --at <index>` and
  `lisp-editor insert --in <srcpath> --into <astpath> --at <index>`. The new node
  (from a shape or copied from another path) is placed before child `<index>`;
  `<index>` may equal the list's length (append).
- **Root as a container.** The root is the program: a list whose children are the
  top-level forms. A new top-level form is added with `insert … --into [] --at
  <n>`. Bootstrapping an empty file is `insert <shape> --into [] --at 0`.
- **Reword user story 8** from "replace the root with a hole" to "insert a form
  into an empty file".

## Delete is placeholder-only (current code)

- `replace hole --out <path>` replaces the node with `_`; it never shrinks a list.
- Evidence: `(let ((y (+ x 1)) (z 2)) (+ y z))` with `replace hole --out [0,2,1,1]` yields
  `(let ((y (+ x 1)) _) (+ y z))` — a malformed `let`, not a removed binding.
- The result does not parse/evaluate, so a "remove X" task can never pass under the current
  scorer at all.

## Root bootstrap is broken (current code)

- `parse` returns the root as a wrapper list of top-level forms, and `printProgram` prints each
  root item as a separate form.
- `replace define --out []` on empty input makes the root itself the define list, whose
  *children* are printed as three separate top-level datums: `define`, `_name`, `_body`.
  `define` is unbound, so the program does not evaluate.
- There is no operation to set the program's contents, and `--out [0]` is out of range on an
  empty root, so an empty file cannot be built into a valid single-form program.

## Invalid-path retry

- Not expressible as a benchmark task: nothing forces the agent to issue an invalid edit.
  It belongs in unit/regression tests instead.
