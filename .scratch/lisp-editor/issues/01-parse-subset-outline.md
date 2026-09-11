# 01: Parse the subset and produce an outline

**What to build:** A user (or agent) can pipe Lisp source into `lisp-editor outline` and get back a JSON description of the AST with an addressable path for every node. This establishes the command, the parser for the supported subset, and the CLI test seam.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `lisp-editor outline` reads source from stdin and prints a JSON array to stdout, one entry per node.
- [ ] Each entry carries `path` (array of child indices), `tag`, and `hole` (boolean).
- [ ] The root is addressed as `[]`; descendants use integer child indices.
- [ ] Identifiers beginning with `_` are reported with `hole: true`.
- [ ] The parser accepts the supported subset: `define`, `lambda`, `let`, `let*`, `if`, `cond`, application, numbers, strings, symbols.
- [ ] Comments and whitespace are accepted on input and discarded (never appear in the tree).
- [ ] Malformed input exits non-zero with a diagnostic and prints no tree.
- [ ] Covered by CLI-boundary tests only.
