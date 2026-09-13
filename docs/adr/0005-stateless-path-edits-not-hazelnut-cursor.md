# Stateless path-based edits, not Hazelnut's cursor calculus

Status: accepted
Date: 2026-09-13

**Context.** The edit-action vocabulary is inspired by Hazelnut (Omar et al.,
POPL 2017), a bidirectionally typed structure editor built around a stateful
cursor and zipper.

**Decision.** Each invocation takes one `(path, node)` edit: the caller supplies
the target path as an argument, the process reads source on stdin and writes the
result on stdout. There is no session, cursor, `select`, or `finish` action, and
no type checking.

**Why.** Statelessness makes every edit a pure function of input text plus
arguments, so a caller can retry safely, invoke the tool from any language, and
never hold a cursor that can drift out of sync with the source. Hazelnut's
cursor calculus buys typed-hole progression this tool deliberately does not
want.

**Considered options.** Hazelnut-style stateful navigation (rejected: needs a
session and a cursor, and drags in type checking); a persistent server holding
the tree (rejected: state to synchronize and to corrupt).
