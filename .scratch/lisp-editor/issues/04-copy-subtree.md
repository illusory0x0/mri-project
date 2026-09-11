# 04: Copy a subtree between paths

**What to build:** A user (or agent) can copy an existing subtree from one location to another, reusing structure instead of retyping it.

**Blocked by:** 02 (replace a node with a shape skeleton and print canonical source)

**Status:** ready-for-agent

- [ ] `replace --in <astpath> --out <astpath>` overwrites the node at `--out` with a copy of the node at `--in`.
- [ ] The copied subtree is independent (a deep copy, not an alias), so later edits to one do not affect the other.
- [ ] Works when either path is the root `[]`.
- [ ] An invalid `--in` or `--out` exits non-zero, prints no source, and leaves the input unchanged.
- [ ] The resulting source always re-parses cleanly.
- [ ] Covered by CLI-boundary tests only.
