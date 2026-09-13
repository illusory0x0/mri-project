# Racket is confined to the experiment harness

Status: accepted
Date: 2026-09-13

**Context.** The edited programs are Racket/Lisp, and the most trustworthy way
to parse and evaluate them is Racket itself.

**Decision.** The product is pure TypeScript with zero runtime dependencies and
a hand-written s-expression parser (no tree-sitter). Racket appears only inside
the experiment harness: in task fixtures and in the scorer that parses, checks,
and executes candidate programs.

**Why.** Depending on a Racket runtime would make the editor harder to install
and would couple a syntax-only tool to an interpreter it does not need. Keeping
the product dependency-free keeps it portable; keeping Racket in the harness
keeps scoring honest, because evaluation uses the real language rather than a
reimplementation.

**Consequences.** Running the experiment requires Racket; running the editor
does not. The scorer is an external-process seam the eval tests depend on.
