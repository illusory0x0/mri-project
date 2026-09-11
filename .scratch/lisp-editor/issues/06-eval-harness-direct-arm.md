# 06: Experiment harness core and the `direct` arm

**What to build:** A reproducible harness that runs an agent against a fixed task set and scores the result, starting with the `direct` arm (the agent emits the whole file as text). This is the baseline against which the structural editor is compared.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A fixed task set of programs requiring 4–6 levels of nesting exists; each task has input source, an instruction, and an expected result.
- [ ] A runner executes an agent for each `(task × arm × seed)`, captures the transcript, and captures the final artifact.
- [ ] A scorer uses Racket to parse the final artifact and to execute/compare it against the expected result.
- [ ] The scorer records at minimum: parse-error rate (distinguishing bracket mismatch), success@1, step count, and token count.
- [ ] The `direct` arm runs end-to-end on the task set and writes one JSON result per run plus a summary.
- [ ] Model, temperature, and prompt are configurable per arm and held equal across arms.
- [ ] Racket is used only inside tasks and scoring; the product gains no Racket dependency.
