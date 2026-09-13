# 12: Add a `delete` verb

**What to build:** From the CLI, `lisp-editor delete --out <path>` removes the
node at that path by splicing it out of its parent list, so an agent can drop a
binding, an argument, or a branch and get a shorter but still well-formed
program. Deleting the root fails, a non-list parent fails, and a failed delete
leaves the source unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Deleting a binding from a `let` yields the same `let` with that binding
      removed, not a `_` placeholder.
- [ ] `delete --out []` fails and leaves the source unchanged.
- [ ] A delete whose parent is not a list fails and leaves the source unchanged.
- [ ] An out-of-range path fails and leaves the source unchanged.
- [ ] The agent-facing tool description documents `delete`.
