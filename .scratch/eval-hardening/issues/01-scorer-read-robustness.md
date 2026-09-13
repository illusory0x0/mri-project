# 01: Harden the scorer's read path: tolerate a leading `#lang` header, report unreadable candidates as unknown

**What to build:** A candidate program that legitimately begins with a `#lang`
header (natural when bootstrapping a from-empty-file task) is parsed, structurally
compared, and evaluated exactly as if that header were absent, so it is no longer
a false parse failure. And when a candidate cannot be read at all, the run's
semantic verdict is `unknown` and is excluded from the semantic denominator,
rather than being reported as `different`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A candidate prefixed with `#lang racket` scores structurally equal to the
      same program without the header.
- [ ] The `t18-bootstrap` task no longer fails for a `#lang`-prefixed candidate;
      re-running it shows the arm scored on its merits.
- [ ] A candidate with a genuine reader error still reports a parse failure.
- [ ] When reading a candidate fails, the semantic verdict is `unknown`, not
      `different`.
- [ ] Covered by a scorer test through the existing process seam.
- [ ] `pnpm run typecheck` and `pnpm test` pass.
