# Architecture Decision Records

Decisions for this repository, one per file. The documentation map is
[../README.md](../README.md); the ownership rule is
[ADR 0013](0013-agents-md-is-the-agent-entry.md).

## Discipline

1. One ADR records one decision.
2. Stay flat: categorize only in the index below; never use subdirectories.
3. Filenames are `NNNN-slug.md`, zero-padded and consecutive; the number is a
   stable citation ID and is never reused.
4. `Status: accepted`. A revision is a **new** ADR — `amends` for a partial
   change, `supersedes` for a wholesale replacement — and the old file's status
   becomes `amended by ADR NNNN` / `superseded by ADR NNNN`.
5. `Date` is the adoption date.
6. When you add an ADR, add it to the index below, in its group.

## Index

### Toolchain

- [0001 — Build with esbuild, type-check with tsc](0001-build-with-esbuild-typecheck-with-tsc.md)
- [0002 — Do not adopt ts-go (`@typescript/native-preview`)](0002-do-not-adopt-ts-go.md)
- [0003 — Keep `node:test`, do not adopt vitest](0003-keep-node-test-not-vitest.md)
- [0004 — Frontend tooling: stay minimal (vanilla + esbuild)](0004-frontend-tooling-stay-minimal.md)
- [0008 — Run tasks with `just`, not `package.json` scripts](0008-run-tasks-with-just-not-package-scripts.md)

### Editor

- [0005 — Stateless path-based edits, not Hazelnut's cursor calculus](0005-stateless-path-edits-not-hazelnut-cursor.md)
- [0006 — Racket is confined to the experiment harness](0006-racket-confined-to-experiment-harness.md)
- [0007 — A purely syntactic editor: no semantics, no reader macros](0007-purely-syntactic-no-semantics.md) (amended by 0011)
- [0011 — Widen the supported subset for real Racket](0011-widen-subset-for-corpus-tasks.md)

### Experiment

- [0009 — Scored programs get a no-I/O guard, not a real sandbox](0009-scored-programs-no-io-guard.md)
- [0010 — Commit compact eval summaries as durable records](0010-commit-compact-eval-summaries.md)
- [0012 — Task sets are directories; a run covers them all; repeats measure stability](0012-task-sets-and-repeats.md)

### Documentation

- [0013 — AGENTS.md is the agent's README; documentation is owned by audience](0013-agents-md-is-the-agent-entry.md)
