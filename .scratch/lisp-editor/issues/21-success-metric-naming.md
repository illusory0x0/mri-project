# 21: Rename the `success@1` metric to `success`

**What to build:** Drop the `@1` suffix from the success metric. `@1` is borrowed
from `pass@k` notation, but every run here is judged on a single final artifact,
so there is no k to sample — the suffix is noise and is treated as a typo.

**Blocked by:** None

**Status:** ready-for-agent

## Tasks

- [x] `CONTEXT.md`: `**Success@1**` → `**Success**`; add `success@1` to `_Avoid_`.
- [x] `docs/spec.md:88` and `docs/spec.md:263`: `success@1` → `success`.
- [x] Unify casing (CONTEXT title-cased the term; the spec lower-cased it).
- [x] State that the harness's boolean `success` is an internal gate, not the
      headline verdict (the headline is the structural and semantic verdicts
      reported separately).
