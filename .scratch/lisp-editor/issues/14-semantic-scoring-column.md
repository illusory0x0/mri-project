# 14: Report a semantic column alongside structural success

**What to build:** A task may declare an optional probe expression. The scorer
evaluates the probe against both the candidate and the expected program in a
fresh namespace under a step budget, and a run is reported with two independent
verdicts: structural (candidate and expected parse to the same datum sequence)
and semantic (the probe yields the same result for both). If either side does
not terminate within the budget, the semantic verdict is `unknown` and is
excluded from the semantic denominator. A task without a probe reports no
semantic verdict.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] With a probe, a candidate that is textually different but returns the same
      probe result is scored semantically equal.
- [x] A candidate that exceeds the step budget is `unknown`, not false, and is
      excluded from the arm's semantic rate.
- [x] A task without a probe reports no semantic verdict.
- [x] Structural scoring is unchanged.
