# 07: Experiment harness `editor` arm

**What to build:** The arm under test: an agent that edits code by calling `lisp-editor` (`outline` and `replace`) through a tool schema, run against the same task set and scored the same way as the other arms.

**Blocked by:** 03 (parameterized atoms), 05 (delete via hole and bootstrap an empty file), 06 (experiment harness core and the `direct` arm)

**Status:** ready-for-agent

- [ ] The `editor` arm prompt and tool wiring let the agent invoke `outline` and `replace` (shape, atom, copy, and hole forms) against the source.
- [ ] The agent has no free-text mode; all edits go through `lisp-editor`.
- [ ] The arm runs the full task set and captures transcript plus final artifact per run.
- [ ] Results are recorded in the same schema and with the same metrics as the `direct` arm.
- [ ] Model, temperature, and prompt are held equal to the other arms apart from the editing interface.
