# 08: Experiment harness `sed`/`awk` arm

**What to build:** The third comparison arm: an agent that edits code using shell text tools (`sed`, `awk`, and ordinary file edits) against the same task set.

**Blocked by:** 06 (experiment harness core and the `direct` arm)

**Status:** ready-for-agent

- [ ] The `sed`/`awk` arm prompt and tool wiring let the agent edit the source using shell text tools.
- [ ] The arm runs the full task set and captures transcript plus final artifact per run.
- [ ] Results are recorded in the same schema and with the same metrics as the other arms.
- [ ] Model, temperature, and prompt are held equal to the other arms apart from the editing interface.
