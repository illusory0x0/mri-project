# 04: Verify diff application so hunk failures stay distinct from bracket mismatches

**What to build:** Verified behavior for applying an agent-produced unified diff,
so the hunk-application rate is trustworthy and never confused with a bracket
mismatch. A valid multi-line, deeply nested diff applies; a non-applying or
malformed diff is reported as a hunk-application failure; context and hunk-header
edge cases do not silently yield a wrong artifact.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A valid multi-line, deeply nested unified diff applies and yields the
      expected patched program.
- [ ] A malformed or non-applying diff is reported as a hunk-application
      failure, not as a parse error.
- [ ] Boundary cases (missing trailing newline, header line counts, no-op diff)
      either apply correctly or fail loudly; none silently produce a wrong
      artifact.
- [ ] Tests exercise the patch-application seam.
- [ ] `just typecheck` and `just test` pass.
