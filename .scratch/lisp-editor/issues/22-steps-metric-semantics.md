# 22: Decide what `steps` measures once a turn can carry many commands

**What to build:** Decide and implement the meaning of the `steps` metric in a
world where one assistant turn can issue several `lisp_editor` tool calls.

**Blocked by:** none

**Status:** ready-for-human

## Evidence

- `steps` is incremented once per tool call (`eval/drivers/openai.ts:164`), so
  a batch of three edits in one assistant message records three steps but costs
  one API round trip.
- The pre-route-A baseline was 130 tool calls over 121 tool-issuing turns
  (1.07 commands per turn, see the committed snapshot in `eval/summaries/`).
- Route A encourages the model to issue independent edits in the same turn, so
  `commandsPerTurn` is expected to rise while `steps` stays equal to the number
  of commands.
- The report's `meanSteps` (`eval/runner.ts`) is computed from `steps`, and the
  spec frames steps as a proxy for effort. If a turn batches, `meanSteps`
  no longer distinguishes "three round trips" from "one round trip, three
  edits".

## Decision needed

- Does `steps` count **commands** (edits), **round trips** (assistant turns), or
  both?
- If both, which is the headline effort metric, and does the report show
  `commandsPerTurn` alongside it?
- Does `summary.ts`'s `batching` block already carry enough (assistantTurns,
  toolTurns, toolCalls, commandsPerTurn) to answer the question without changing
  `RunResult`?

## Tasks

- [ ] Decide the semantics of `steps`.
- [ ] Update the relevant code/report/spec so the metric is unambiguous.
