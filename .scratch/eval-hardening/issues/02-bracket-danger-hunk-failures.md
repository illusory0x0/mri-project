# 02: Separate diff hunk-application failures from bracket mismatches in the bracket-danger cell

**What to build:** The bracket-danger reliability cell reports patch/hunk
application failures as their own rate, so the `diff` arm's mechanical
transcription errors (observed on `t15-reorder-args` and `t19-deep-nest`) no
longer inflate the parse-error rate that is meant to measure bracket safety. The
cell surfaces three independent failure rates: parse error, bracket mismatch, and
hunk-application failure.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A run whose diff patch failed to apply is counted as a hunk-application
      failure, not as a parse error.
- [ ] A run with unmatched parentheses is counted as a bracket mismatch, as today.
- [ ] The bracket-danger cell shows parse-error, bracket-mismatch, and
      hunk-application rates separately.
- [ ] Per-run artifacts record which failure occurred.
- [ ] `pnpm run typecheck` and `pnpm test` pass.
