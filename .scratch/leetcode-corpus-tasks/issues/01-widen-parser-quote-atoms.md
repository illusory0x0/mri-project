# 01: Widen the parser and printer for quote, booleans, and characters

**What to build:** The editor admits the reader forms that block the real-Racket
corpus, without taking on semantics. `'<datum>` reads as a `(quote <datum>)`
list, booleans and characters become first-class atoms, and `outline` names the
three new kinds. Backquote and unquote stay rejected.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `'x` and `'(a b)` parse to a two-element list `(quote x)` / `(quote (a b))`;
      a quote at the head of a list is handled too.
- [x] `` ` `` and `,` / `,@` still fail at parse with a clear message.
- [x] `#t` / `#f` are atoms with tag `boolean`; `#\a`, `#\(`, `#\space`,
      `#\newline` are atoms with tag `character`.
- [x] Printing a boolean or character emits its source text verbatim; printing a
      quote list emits `(quote …)`, and the result re-parses.
- [x] `outline` reports `boolean`, `character`, and `quote` kinds, so a
      `(quote …)` node is not reported as `apply`.
- [x] The scorer's golden corpus covers a `(quote x)` candidate matching a `'x`
      expected program structurally.
- [x] CLI-level tests assert parse, print, and outline for the forms above.
- [x] `just typecheck` and `just test` pass.
