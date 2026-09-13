# Build with esbuild, type-check with tsc

Status: accepted
Date: 2026-09-13

**Context.** The build previously used `tsc` to emit `dist/`, and the CLI bin,
eval runner, and tests all hard-code paths under `dist/`.

**Decision.** Transpile `src/`, `eval/`, and `test/` with esbuild, preserving
the directory layout (`dist/src/cli.js`, etc.), and keep `tsc --noEmit` for
type-checking.

**Why.** esbuild builds in milliseconds but does no type-checking. Keeping
`tsc` for `typecheck` preserves `strict` mode while removing emit from the
critical path. `typescript` stays as a dev dependency for checking only.

**Consequences.** The `build` script uses `rm -rf dist` for a clean output and
relies on a POSIX shell; fine for the current Linux environment.
