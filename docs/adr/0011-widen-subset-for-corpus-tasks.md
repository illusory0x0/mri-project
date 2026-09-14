# Widen the supported subset for real Racket

Status: accepted
Date: 2026-09-14

**Context.** The editor's subset (ADR 0007) rejects the reader characters `'`,
`` ` ``, `,` and models only symbol, number, and string atoms. A second task set
is to be authored from a corpus of real Racket LeetCode solutions, whose most
common blockers are quote (39 files), booleans (38), and characters (9).

**Decision.** Widen the subset in a bounded way:

- `'…` is normalized on parse to the list `(quote …)`: a quoted datum is an
  ordinary list node, not a new atom kind.
- Booleans (`#t`/`#f`) and characters (`#\c`) become real **Atom** kinds.
- Skeleton shapes gain `letrec`, `and`, `or`, `when`, `unless`, `begin`, and
  named `let`; `match` and `for/*` are parseable and copyable but have no shape.
- Modules and metaprogramming stay out of scope: `require`, `provide`, `struct`,
  `class`, `define-syntax`, `shift`/`reset`, `let/cc`, `module+`, vector
  literals, and hash literals are excluded.

**Consequences.** ADR 0007's "a program containing `'` cannot enter the tool" no
longer holds. Because quote is represented canonically, the scorer's structural
comparison against Racket-read expected programs still matches. The tool stays
purely syntactic: no evaluation, no macro expansion.

**Supersedes.** Amends ADR 0007.
