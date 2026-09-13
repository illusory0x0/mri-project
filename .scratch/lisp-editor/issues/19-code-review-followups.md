# 19: Resolve code-review follow-ups from the delete/insert/semantic work

**What to build:** Track the eval-harness issues raised by the code review of
tickets 12-18. None change scores; they tighten types, remove duplicated work,
and settle one metadata definition.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Compute `depth` in one place: extract a `withDepth(task): LoadedTask`
      helper and use it in `eval/runner.ts` (`runOne`, `loadTasks`) and
      `eval/report.ts` instead of the three repeated `computeTargetDepth(...)`
      expressions.
- [ ] Stop fixtures carrying depth: remove `depth` from `Task`, add
      `LoadedTask = Task & { depth: number }`, have `loadTasks` return
      `LoadedTask[]`, update `ReportData.tasks` and the report client.
- [ ] Evaluate each side once in `eval/score.rkt`: fold `evaluates?` and
      `probe-result` into one per-side parse/eval so the probe reuses the same
      fresh namespace, keeping the `unknown` and error-comparison semantics.
- [ ] Replace the nested semantic-label ternary in `eval/report.client.ts` with a
      single `Record<SemanticVerdict, string>` map.
- [ ] Decide target-depth semantics for insert/delete: `computeTargetDepth`
      returns the containing list's depth when child counts differ, one less than
      the added/removed node. Either keep it (and pin it with a test) or return
      the affected node's depth and recompute the stored run metadata.
- [ ] `just typecheck` and `just test` pass.
