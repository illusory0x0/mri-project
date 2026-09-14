# 02: Add skeleton shapes for the corpus forms

**What to build:** The shape vocabulary can construct the special forms used by
the selected corpus files, so a `build`/`wrap` edit does not need to be composed
from generic lists. New shapes: `letrec`, `and`, `or`, `when`, `unless`,
`begin`, and a named `let`. `match` and `for/*` deliberately get no shape.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `expandShape` supports `letrec` → `(letrec ((_name _value)) _body)`.
- [x] `expandShape` supports `and` / `or` → `(and _arg1 _arg2)` /
      `(or _arg1 _arg2)`.
- [x] `expandShape` supports `when` / `unless` → `(when _cond _body)` /
      `(unless _cond _body)`.
- [x] `expandShape` supports `begin` → `(begin _body1 _body2)`.
- [x] `expandShape` supports `let-loop` → `(let _loop ((_name _value)) _body)`,
      the named `let`.
- [x] The unknown-shape error lists every new shape.
- [x] `match` and `for/*` remain constructible only as ordinary lists (no
      shape), and this is documented in the `lisp_editor` tool description.
- [x] CLI-level tests assert each new shape's expansion.
- [x] `just typecheck` and `just test` pass.
