# Keep `node:test`, do not adopt vitest

Status: accepted
Date: 2026-09-13

**Context.** 50 tests, pure Node, no DOM/browser. Tests come in two shapes:
`eval.test.ts` imports modules directly, while `outline`/`replace` tests spawn
`dist/src/cli.js` for end-to-end coverage.

**Decision.** Keep the built-in `node:test` + `node:assert` runner.

**Why.** Vitest would pull in a large dependency tree (vite/rollup/tinypool/…)
and need a config file, but its main wins don't apply here: it cannot remove the
build step because the CLI tests need `dist/`, and the esbuild build is ~7ms so
build latency is not a pain point. Watch mode, snapshots, mocking, and coverage
are already available via `node --test --watch` and
`--experimental-test-coverage`.

**Revisit when.** Tests need heavy mocking/snapshot support, a browser/DOM
environment, or mature coverage reporting.
