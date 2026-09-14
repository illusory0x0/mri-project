# 03: Decide and enforce the boundary on what a scored program may do

**What to build:** A decided, recorded boundary on what a scored program may do
beyond computation. Today evaluation is bounded in time and memory but is not
prevented from touching the filesystem or the network, so an LLM-generated
candidate can have side effects on the machine running the experiment. The
decision is recorded; the chosen guard is implemented and tested.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The boundary decision is recorded as an ADR: either a real sandbox, or an
      explicit accepted-risk with a no-I/O guard.
- [ ] The chosen guard is implemented and exercised by a test that feeds the
      scorer a candidate attempting filesystem or network access.
- [ ] If the guard is detection rather than prevention, the run is flagged (not
      silently scored as an ordinary verdict) and the risk is stated in the ADR.
- [ ] `just typecheck` and `just test` pass.
