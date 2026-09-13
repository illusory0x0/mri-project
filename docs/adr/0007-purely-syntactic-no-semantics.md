# A purely syntactic editor: no semantics, no reader macros

Status: accepted
Date: 2026-09-14

**Context.** The target programs are ordinary Lisp/Racket code. The supported
subset is `define`, `lambda`, `let`, `let*`, `if`, `cond`, variables,
application, numbers, strings, and symbols.

**Decision.** The tool is pure AST editing and takes on no semantic
responsibility of any kind: no type checking, no scope resolution, no macro
expansion, and no evaluation. Consistently with that, the parser rejects the
reader characters `'`, `` ` `` and `,` (hence `,@` too), and macro forms such as
`(define-syntax …)` parse as ordinary lists that the tool is indifferent to.

**Why.** Semantic work belongs to an interpreter or compiler, not a structure
editor. The target programs do not use reader macros, and supporting them would
make `parser.ts` more complicated.

**Consequences.** A program containing `'` cannot enter the tool at all — it
fails at parse, rather than being silently mis-edited. The editor can neither
check nor preserve any semantic property of the program it edits.

**Revisit when.** The benchmark language gains quote or macro syntax, or
semantics ever come into scope.

**Related.** ADR 0005 records the stateless path-based edit over Hazelnut's
stateful, typed cursor calculus.
