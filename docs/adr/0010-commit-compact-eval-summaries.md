# Commit compact eval summaries as durable records

Status: accepted
Date: 2026-09-14

**Context.** `eval/results/` holds one JSON file per run, each carrying the full
transcript and final artifact, and is git-ignored for size. That made the raw
evidence of a run ephemeral: the vocabulary-v2 decision (issue #20) cited
real-model runs that could never be recovered, because overwriting or cleaning
`eval/results/` silently destroys them. Re-running a model to regenerate the
evidence costs real API money and time, so results need to be durable enough to
avoid a re-run — but durable artifacts also accumulate, and a research program
must be free to prune them.

**Decision.** After a run, `eval/summary.ts` (`just summary`) reads
`eval/results/` and writes a compact, self-contained snapshot to
`eval/summaries/`, committed to git. A snapshot records:

- **Provenance**: `generatedAt`, `gitCommit` and `gitDirty`, model, temperature,
  driver, and content hashes of the arm definitions (`armHash`), the shape
  vocabulary and tool catalogue (`vocabHash`), the task set (`taskSetHash`), and
  the scorer (`scorerHash`).
- **Aggregates**: the headline and bracket-danger arm summaries, plus a
  per-`construct` split of success/structural/semantic rates, steps, and tokens.
- **Batching diagnostics**: assistant turns, tool-issuing turns, tool calls, and
  commands per turn — the direct signal for whether a prompt encourages several
  edits per turn.
- **A compact per-run row table**: `taskId`, arm, construct, locate, verdicts,
  steps, tokens. No transcripts and no final artifacts.

Raw `eval/results/` stays git-ignored and may be overwritten at will; the
snapshot is the durable record. A decision that relies on a run cites its
snapshot, so pruning the snapshot later still leaves the decision traceable.

**Why.** The snapshot is small enough to review and version, survives raw-result
cleanup, and — because of the content hashes — makes a stale snapshot
identifiable without re-running anything. Its per-`construct` and batching
fields exist because the cost question is not uniform across constructs and the
per-arm mean hides that.

**Pruning policy.** Snapshots are a research artifact with a carrying cost, not
an archive. A snapshot may be deleted only at a **late stage of the research**,
when it is *entirely stale* (its config is superseded and it is no longer a
comparison point) or when *a new, more important question displaces it*. Until
then they are kept. Routine cleanup of `eval/results/` never touches
`eval/summaries/`. The working tree represents the latest understanding of the
research; git history is a best-effort safety net, not an obligation, and the
treatment that matters is the arm definition, not the observation. Deleting a
snapshot from the working tree leaves it in git history; reclaiming repository
size requires a history rewrite, which is a separate decision.

**Consequences.** `eval/summaries/` is committed data that must be regenerated
(not hand-edited). Mixed models or temperatures in one results directory are
joined into provenance strings rather than separated; isolate runs with `--out`
when a clean comparison is needed. Snapshots do not replace `eval/report.html`,
which stays the interactive view over live raw results.

**Revisit when.** The experiment matures into a stable benchmark with an
external results store, or snapshot volume itself becomes a measurable cost.
