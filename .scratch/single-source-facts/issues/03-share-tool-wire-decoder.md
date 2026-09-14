# 03: Share the tool wire-format decoder

**What to build:** Decoding a tool call — the structural editor's `args` and the
shell `command` — lives in one pure module used by both the harness runner and
the browser report, so the wire format is interpreted identically everywhere and
the duplicate decoder is gone.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] One pure decoder is used by the runner and the report client; the second
      copy is removed.
- [ ] The report still renders structural-editor commands and shell commands as
      it did before.
- [ ] `just typecheck` and `just test` pass.
