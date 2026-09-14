# 04: Wire the corpus task set into the harness and docs

**What to build:** The new task set runs alongside the synthetic ones and is
reported separately. `just eval --tasks eval/tasks-leetcode` works; the summary
groups by task set so the realism branch is readable without confounding the
orthogonal cells; the README credits the corpus and documents the new set.

**Blocked by:** 03

**Status:** done

- [x] `--tasks eval/tasks-leetcode` loads and runs the corpus set through the
      existing arms with no harness changes beyond task-shape handling.
- [x] Tasks without `construct` do not break per-`construct` aggregation; the
      snapshot reports corpus tasks under their `operation` instead.
- [x] The summary groups results by task set (synthetic / orthogonal / corpus).
- [x] README gains the **Acknowledgements** section crediting upstream
      `s-cerevisiae/leetcode-racket` (MIT) and states that `tmp/` is a fork.
- [x] README documents `eval/tasks-leetcode/`, the mutate-existing task format,
      the `operation` axis, and the `source` field.
- [x] `just typecheck` and `just test` pass.
