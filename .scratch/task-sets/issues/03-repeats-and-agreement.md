# 03: Repeat runs and show agreement

**What to build:** An opt-in `--repeats N` re-executes each task × arm N times so
run-to-run stability can be read directly, and the report shows agreement across
those repeats. With `N = 1` nothing about the artifacts or the display changes.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `--repeats N` runs each task × arm N times; each execution is a distinct
      run carrying its repeat index.
- [ ] Artifacts are named `arm-task.json` when `N = 1` and `arm-task-r<N>.json`
      otherwise.
- [ ] With repeats present, report cells show agreement as `n/N` and a
      per-(set, arm) stability table summarizes agreement.
- [ ] With `N = 1` the filenames and the report display are unchanged.
- [ ] A test asserts N repeats produce N artifacts with distinct repeat indices,
      and that `N = 1` keeps the current filenames.
- [ ] `just typecheck` and `just test` pass.
