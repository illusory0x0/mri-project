# 02: Replace a node with a shape skeleton and print canonical source

**What to build:** A user (or agent) can point `lisp-editor replace <shape> --out <path>` at any node and have it replaced with a prepared shape skeleton, with the full resulting program printed back. This is the first mutating command and introduces path resolution plus the deterministic printer.

**Blocked by:** 01 (parse the subset and produce an outline)

**Status:** ready-for-agent

- [ ] `replace <shape> --out <path>` replaces the node at the AST path with the shape's skeleton.
- [ ] Supported shapes in v1: `lambda` → `(lambda (_param) _body)`, `if` → `(if _cond _then _else)`, `define` → `(define _name _body)`, `let` → `(let ((_name _value)) _body)`, `apply` → `(_func _args)`, `hole` → a bare `_` placeholder.
- [ ] Unspecified children of a shape are holes (`_`-prefixed identifiers).
- [ ] `--out` is an AST path; `[]` addresses the root.
- [ ] On success the full resulting source is printed to stdout.
- [ ] Output is canonical and deterministic: the same AST always prints to the same text.
- [ ] Printed output always re-parses cleanly.
- [ ] An invalid path or unknown shape exits non-zero, prints no source, and leaves the input unchanged.
- [ ] Covered by CLI-boundary tests only.
