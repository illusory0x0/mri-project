# 02: Pin the scorer's verdicts with a golden corpus over the task set

**What to build:** A table-driven golden corpus that asserts the scorer's
verdicts for the whole fixed task set, so the experiment's numbers rest on tested
semantics rather than inspection. For each task, the expected program, a
known-wrong candidate, an unreadable candidate, and a non-terminating probe each
produce their intended verdicts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] For every task, the expected program scores structurally equal and, where
      a probe exists, semantically `equal`.
- [ ] A known-wrong candidate is neither structurally nor semantically equal
      (`different` where a probe exists).
- [ ] A candidate with a genuine reader error reports a parse failure, and its
      semantic verdict is `unknown` (not `different`) where a probe exists.
- [ ] A candidate whose probe does not terminate reports semantic `unknown`.
- [ ] A task without a probe reports no semantic verdict.
- [ ] Assertions run through the existing scorer process seam.
- [ ] `just typecheck` and `just test` pass.
