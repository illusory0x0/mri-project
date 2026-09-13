# Do not adopt ts-go (`@typescript/native-preview`)

Status: accepted
Date: 2026-09-13

**Context.** esbuild compiles the project but does not type-check, so
`tsc --noEmit` remains the checker. `ts-go` is TypeScript's native (Go) port
and could make type-checking much faster.

**Decision.** Keep `tsc` as the only type-checker for now.

**Why.** `ts-go` is a preview and unstable. Type-checking is load-bearing for
AI-driven edits, so a flaky checker is worse than a slower reliable one. The
`ts-go-lsp` integration is also not good enough to rely on.

**Revisit when.** `ts-go` stabilizes and its editor/LSP integration is usable,
ideally as a separate `typecheck:tsgo` script that does not replace the
default `tsc` path.
