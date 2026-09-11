# 05: Delete via hole and bootstrap an empty file

**What to build:** A user (or agent) can delete a node (replacing it with a hole) and can start editing an empty file by turning the root into an editable placeholder.

**Blocked by:** 02 (replace a node with a shape skeleton and print canonical source)

**Status:** ready-for-agent

- [ ] `replace hole --out <path>` replaces the node at the path with a bare `_` placeholder, i.e. deletes it.
- [ ] Given empty input, `replace hole --out []` produces a single editable root placeholder.
- [ ] Root-level operations (`[]`) work consistently with nested paths.
- [ ] The resulting source always re-parses cleanly.
- [ ] An invalid path exits non-zero, prints no source, and leaves the input unchanged.
- [ ] Covered by CLI-boundary tests only.
