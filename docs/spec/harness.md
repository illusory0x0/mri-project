# The experiment harness

## Scope

A four-arm harness lives in `eval/` and is driven by `just` (ADR 0008). It runs a
model against a task set using several **Arms**, scores every **Run**, and
produces per-run artifacts, a browsable report, and compact committed snapshots.
Racket appears only in the harness — in the scorer, never in the product
(ADR 0006).

## Arms

- `direct` — the agent replies with the whole program.
- `ast-edit` — the agent drives the `lisp_editor` structural tool. Its prompt
  encourages independent edits to be batched into one turn while keeping
  path-dependent edits (after an insert, delete, or list replace) separate.
- `text-edit` — the agent uses a `shell` tool (bash / sed / awk).
- `diff` — the agent replies with a unified diff that the harness applies.

## Run model

A **Run** is one task × arm × **Driver** execution, with its transcript, score,
step count, token count, and repeat index. The driver is the agent backend
(`mock` or the OpenAI-compatible driver), and every run artifact records which
driver produced it, the model and temperature actually used, the structural and
semantic verdicts, and the task's target depth.

**Effort** is recorded as `steps` (conversation rounds — one per assistant turn,
including the final confirmation turn, regardless of how many tool calls the turn
issues) and `tokens` (summed API usage). Tool-call count and commands per turn are
recorded separately in the snapshot's batching diagnostics.

A run has a per-run timeout and the harness runs with bounded concurrency.

## Repeats and stability

`--repeats N` (default `1`) re-executes each task × arm N times. Each execution is
a distinct run carrying its repeat index, and artifacts are named `arm-task.json`
when `N = 1` and `arm-task-r<N>.json` otherwise, so single-run names are
unchanged. Agreement across repeats is the share of a task × arm × driver's runs
that match its modal verdict signature; the report shows it per cell as `n/N` and
summarizes it per (set, arm). With `N = 1` the display is unchanged. See
ADR 0012.

## Scoring

Each run gets two independent verdicts:

- **Structural** — candidate and expected parse to the same datum sequence.
- **Semantic** — the task's `probe`, where one exists, evaluates to the same
  result for both. Evaluation is bounded; a side that does not terminate within
  the budget, or cannot be read at all, is `unknown` and excluded from the
  semantic denominator.

The harness also records a single boolean `success` (structurally equal **and**
evaluates) as an internal gate; it is not itself the headline verdict, so a
semantically equivalent but non-canonical answer is not scored as a failure.

The scorer reads and evaluates candidate programs in a namespace loaded with the
full `racket` language, then installs a detection-only I/O guard over the obvious
filesystem, process, network, and environment bindings. A blocked candidate is
flagged `ioViolation` rather than scored as an ordinary verdict. This is
detection, not a real sandbox (ADR 0009).

## Bracket-danger cell

Tasks flagged `bracketDanger` are reported in a separate reliability cell and
excluded from the headline summary, so the bracket-safety claim stays falsifiable
without being the headline.

## Reports and snapshots

- Raw results are one JSON file per run plus `summary.json`, written under
  `eval/results/` (git-ignored).
- `just report` writes `eval/report.html`. It loads the whole tasks tree and
  matches runs by task id, offers a task-set filter, shows the set and the
  construct/operation on every task card, and renders the per-set headline, the
  per-construct / per-operation aggregates, and (when repeating) the stability
  table.
- `just summary` derives a compact, committable snapshot under
  `eval/summaries/` (ADR 0010): provenance (git commit, model, and content hashes
  of the arms, vocabulary, scorer, and every task set plus a whole-tasks-tree hash
  used in the filename), the per-arm headline split by set, per-construct and
  per-operation aggregates, `(set, arm)` cells, batching diagnostics, stability,
  and the per-run rows — with no transcripts. The snapshot is the durable record;
  raw results can be pruned.

`just report` and `just summary` accept `--results`, `--tasks`, `--arms`, and
`--out`, so a non-default task set can be browsed or snapshotted by pointing them
at its directories.

### Trust

Because every run artifact self-describes its driver and the configuration
actually used, a mock run is never mistaken for a real one; the report shows the
same in a run's request context. Scorer verdicts are pinned by a table-driven
golden corpus over the task set, and the patch-application seam has its own
boundary tests.

## User Stories

1. As an experimenter, I want the same model, prompt, and temperature across
   arms, so that the only variable is the editing interface.
2. As an experimenter, I want to measure parse-error and bracket-mismatch rates as
   a separate reliability cell, so that the bracket-safety claim stays falsifiable
   without being the headline.
3. As an experimenter, I want success split into structural equality (same
   program) and semantic equivalence (same probe result), so that a non-canonical
   but equivalent answer is not scored as a failure.
4. As an experimenter, I want to measure steps and tokens, so that the effort
   claim is quantified.
5. As an experimenter, I want Racket used only for parsing and evaluating results
   during scoring, so that the product has no Racket runtime dependency.
6. As an experimenter, I want per-task, per-arm result artifacts, so that runs are
   reproducible and inspectable.
7. As an experimenter, I want to repeat each task × arm N times, so that I can see
   whether a verdict is stable or a single-sample artifact.
8. As an experimenter, I want repeated runs to be separate, labelled artifacts, so
   that no repeat overwrites another.
9. As an experimenter, I want the report to show agreement across repeats, so that
   instability is visible at a glance.
10. As an experimenter, I want repeats to be off by default, so that ordinary runs
    keep their current cost.
11. As an experimenter, I want the report to filter by set, so that I can read
    Basic, Orthogonal, and LeetCode side by side or one at a time.
12. As an experimenter, I want the summary to record every set and its hash, so
    that a snapshot states exactly what was run.
13. As an experimenter, I want the headline and aggregates split by set, so that a
    LeetCode result is not averaged into a Basic result.

## Testing Decisions

**What makes a good test here.** Tests assert external behavior only: the loaded
task list, the snapshot's provenance and grouping, and the run/report
entrypoints' observable output. Tests never reach into helper internals.

**Seams.** The existing Node seams are reused: the task loader, the snapshot
builder, and the eval/report entrypoints. No new seam is introduced.

**Coverage.** The harness unit tests cover summarization, depth, provenance, and
grouping; the golden corpus pins scorer verdicts; and an integration test spawns
`run.js` with `--repeats 2` and asserts one artifact per repeat.

**Prior art.** The existing harness unit tests and the golden-corpus tests.

## Out of Scope

- General semantic equivalence of arbitrary programs (undecidable). Only a
  task-declared probe is compared, and a side that does not terminate within the
  time budget is reported as `unknown`.
- Statistical significance testing across repeats; agreement is descriptive.
- A real sandbox for scored programs; the I/O guard is detection only.
- An MCP adapter.
- GitHub/remote issue publishing (the local-markdown tracker is used for now).
