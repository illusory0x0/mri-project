# Decisions

Short record of tooling decisions and their tradeoffs. Newest at the top.

## 2026-09-13 — Keep `node:test`, do not adopt vitest

**Context.** 50 tests, pure Node, no DOM/browser. Tests come in two
shapes: `eval.test.ts` imports modules directly, while `outline`/`replace`
tests spawn `dist/src/cli.js` for end-to-end coverage.

**Decision.** Keep the built-in `node:test` + `node:assert` runner.

**Why.** Vitest would pull in a large dependency tree (vite/rollup/
tinypool/…) and need a config file, but its main wins don't apply here:
it cannot remove the build step because the CLI tests need `dist/`, and
the esbuild build is ~7ms so build latency is not a pain point. Watch mode,
snapshots, mocking, and coverage are already available via `node --test
--watch` and `--experimental-test-coverage`.

**Revisit when.** Tests need heavy mocking/snapshot support, a browser/DOM
environment, or mature coverage reporting.

## 2026-09-13 — Do not adopt ts-go (`@typescript/native-preview`)

**Context.** esbuild compiles the project but does not type-check, so
`tsc --noEmit` remains the checker. `ts-go` is TypeScript's native (Go)
port and could make type-checking much faster.

**Decision.** Keep `tsc` as the only type-checker for now.

**Why.** `ts-go` is a preview and unstable. Type-checking is load-bearing
for AI-driven edits, so a flaky checker is worse than a slower reliable
one. The `ts-go-lsp` integration is also not good enough to rely on.

**Revisit when.** `ts-go` stabilizes and its editor/LSP integration is
usable, ideally as a separate `typecheck:tsgo` script that does not replace
the default `tsc` path.

## 2026-09-13 — Build with esbuild, type-check with tsc

**Context.** The build previously used `tsc` to emit `dist/`, and the CLI
bin, eval runner, and tests all hard-code paths under `dist/`.

**Decision.** Transpile `src/`, `eval/`, and `test/` with esbuild,
preserving the directory layout (`dist/src/cli.js`, etc.), and keep
`tsc --noEmit` for type-checking.

**Why.** esbuild builds in milliseconds but does no type-checking. Keeping
`tsc` for `typecheck` preserves `strict` mode while removing emit from the
critical path. `typescript` stays as a dev dependency for checking only.

**Consequences.** The `build` script uses `rm -rf dist` for a clean output
and relies on a POSIX shell; fine for the current Linux environment.
