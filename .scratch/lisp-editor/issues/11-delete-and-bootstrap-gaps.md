# 11: No structural delete, and root bootstrap is broken

**What to address:** Two capabilities promised by the user stories are not actually available, discovered while trying to add coverage tasks. Both block measuring `editor` expressiveness.

**Blocked by:** none

**Status:** parked (needs design)

## Delete is placeholder-only

- `replace hole --out <path>` replaces the node with `_`; it never shrinks a list.
- Evidence: `(let ((y (+ x 1)) (z 2)) (+ y z))` with `replace hole --out [0,2,1,1]` yields
  `(let ((y (+ x 1)) _) (+ y z))` — a malformed `let`, not a removed binding.
- The result does not parse/evaluate, so a "remove X" task can never pass under the current
  scorer at all.
- User story 7 ("delete a node by replacing it with a hole") overstates this: a hole is a
  placeholder, not a structural delete.

## Root bootstrap is broken

- `parse` returns the root as a wrapper list of top-level forms, and `printProgram` prints each
  root item as a separate form.
- `replace define --out []` on empty input makes the root itself the define list, whose
  *children* are printed as three separate top-level datums: `define`, `_name`, `_body`.
  `define` is unbound, so the program does not evaluate.
- There is no operation to set the program's contents, and `--out [0]` is out of range on an
  empty root, so an empty file cannot be built into a valid single-form program.
- User story 8 ("bootstrap an empty file by replacing the root with a hole") reaches `_` but
  cannot proceed to a well-formed program.

## Invalid-path retry

- Not expressible as a benchmark task: nothing forces the agent to issue an invalid edit.
  It belongs in unit/regression tests instead.

## Directions

- Add a real structural delete (e.g. `delete --out <path>` that splices the element out of its
  parent list), or drop delete from the vocabulary and reword user story 7.
- Fix root addressing so the root's items are addressable and mutable, or add a
  `program`/`set-root` operation so bootstrap works.
