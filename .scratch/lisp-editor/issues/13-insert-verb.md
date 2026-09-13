# 13: Add an `insert` verb, including root append

**What to build:** `insert <shape> --into <path> --at <index>` and
`insert --in <src> --into <path> --at <index>` place a node before child
`<index>` of the list at `<path>`; `<index>` may equal the list's length
(append). Because the root is the program's list of top-level forms, inserting
into the root appends a top-level form, so an empty program can be bootstrapped
into a well-formed program.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Inserting into the root of an empty program yields exactly one top-level
      datum; inserting a `define` shape yields one top-level form, not three
      separate datums.
- [x] A node inserted at index `i` appears immediately before the child that was
      at `i`.
- [x] `--at` equal to the list's length appends.
- [x] `insert --in` copies the subtree at the source path into the destination.
- [x] Inserting into a non-list, or an `--at` outside the valid range, fails and
      leaves the source unchanged.
- [x] The agent-facing tool description documents `insert`.
