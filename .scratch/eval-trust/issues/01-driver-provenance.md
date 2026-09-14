# 01: Record the driver identity and run configuration in each run artifact

**What to build:** Every run artifact self-describes which driver produced it and
under what configuration, so a reader can tell an LLM-backed run from a mock run
without inspecting transcript shape. The report surfaces the same fact. This
makes "is this real?" answerable from the artifact itself, not from a forensic
reading of the transcript.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Each per-run JSON records the driver identity (the mock driver vs. the
      OpenAI-compatible driver) and the run configuration actually used (model,
      temperature).
- [ ] The report shows the driver identity for a run, alongside model and
      temperature in the request-context view.
- [ ] A mock run is visibly labelled as mock; an LLM run names its model.
- [ ] A test asserts that a run result records its driver.
- [ ] `just typecheck` and `just test` pass.
