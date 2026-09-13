# 18: Run the four arms with a real model and publish the report

**What to build:** Run all four arms over the full task set with a real model
and publish the per-run artifacts plus a summary reporting structural and
semantic success, steps/tokens, and the bracket-danger cell separately.
Mock-driver results are not published as evidence.

**Blocked by:** 14, 15, 16, 17

**Status:** ready-for-agent

- [ ] A real-model run covers every task × arm.
- [ ] The summary reports structural and semantic rates, steps/tokens, and the
      bracket-danger cell separately, with `unknown` excluded from the semantic
      denominator.
- [ ] The report records the model name and temperature.
