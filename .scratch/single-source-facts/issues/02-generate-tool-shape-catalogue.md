# 02: Generate the tool shape catalogue from the editor

**What to build:** The agent-facing `lisp_editor` description's shape list is
produced from the editor's own shape catalogue plus the atom shapes, not typed
out a second time, so the description cannot name a shape the editor lacks or
omit one it has. The hand-written semantic prose stays.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The description's shape section is generated from the editor's shape
      catalogue; the hand-written shape list is gone.
- [ ] Every shape the editor accepts appears in the description, and an unknown
      shape still errors with the catalogue.
- [ ] The prompt change is noted in the findings doc, with the note that existing
      snapshots are historical.
- [ ] `just typecheck` and `just test` pass.
