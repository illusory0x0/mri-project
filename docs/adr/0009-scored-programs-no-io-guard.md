# Scored programs get a no-I/O guard, not a real sandbox

Status: accepted
Date: 2026-09-14

**Context.** The scorer parses and executes an LLM-generated candidate program to
decide whether it evaluates and whether its probe agrees with the expected
program's. Evaluation is already bounded in time and memory
(`call-with-limits`, ADR 0006), but nothing stopped a candidate from reading or
writing the filesystem, spawning processes, or opening a network connection on
the machine running the experiment.

A real sandbox — an OS-level jail, a container, or Racket's `make-evaluator`
sandbox — would prevent I/O outright. The experiment runs on the maintainer's
machine, candidates come from a fixed, small task set, and the cost of a true
sandbox (container runtime, platform-specific setup, a slower eval path) is not
justified by the current threat model.

**Decision.** The boundary is an explicit, accepted risk backed by a
detection-only guard. When the scorer evaluates a candidate, it installs a base
namespace in which the obvious filesystem, process, network, and environment
bindings (`open-input-file`, `open-output-file`, `call-with-*`, `delete-file`,
`make-directory`, `directory-list`, `system`, `subprocess`, `tcp-*`, `udp-*`,
`getenv`, `putenv`, `dynamic-require`, …) are replaced by procedures that raise a
marked error (`eval/score.rkt`).

A flagged run is not scored as an ordinary verdict: the scorer reports
`ioViolation: true`, the run artifact records it, and the report shows it in the
run's parameter chips. The guard is exercised by tests that feed the scorer
candidates attempting a file read, a file write, and a network connection.

**Why.** The guard is cheap, needs no new runtime or platform work, and makes the
common cases loud instead of silent. Flagging rather than silently scoring keeps
the artifact honest about what happened.

**Consequences.** This is detection, not prevention. A candidate that reaches the
underlying primitives another way — in particular by `require`-ing a module that
re-exports them out of the base namespace, or through `eval`/`compile` on a
constructed expression — can still perform I/O and may not be flagged. The guard
therefore raises the cost of accidental side effects but does not guarantee the
machine is untouched. Racket remains a required harness dependency (ADR 0006).

**Revisit when.** Candidates come from an untrusted source, the experiment runs
on shared or production infrastructure, or scoring moves to a purpose-built
language where the evaluator can enforce the boundary rather than detect it.

**Related.** ADR 0006 confines Racket to the harness and establishes the
external-process scorer seam this guard lives behind.
