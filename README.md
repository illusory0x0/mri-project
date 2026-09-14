# lisp-editor

Stateless structural editor for a Lisp subset. It exposes a set of
AST-level operations (outline, replace, hole, ...) through a CLI so that an
agent can edit programs by manipulating structure instead of raw text.

This project is explored through an agent: [`AGENTS.md`](AGENTS.md) is the
agent's entry point and owns setup, task commands, and eval credentials. The
documentation map is in [`docs/README.md`](docs/README.md), and the product
spec under [`docs/spec/`](docs/spec/README.md).

## The experiment

The `eval/` harness runs a model against a set of **tasks** using several
**arms** (editing strategies), then scores the results. It ships three task
sets — hand-authored Basic and Orthogonal edits, and LeetCode tasks derived
from a corpus of real Racket solutions — and can repeat each task × arm to
measure stability. Results are browsable in a generated report and are captured
durably as compact, committed snapshots.

- The task model, the sets, and task selection:
  [`docs/spec/tasks.md`](docs/spec/tasks.md).
- The arms, run model, scoring, repeats, reports, and snapshots:
  [`docs/spec/harness.md`](docs/spec/harness.md).
- What the runs have shown so far:
  [`docs/spec/findings.md`](docs/spec/findings.md).

To run it, configure a model and run the eval; the credentials, commands, and
full flag list are in [`AGENTS.md`](AGENTS.md).

## Acknowledgements

The LeetCode corpus under `eval/tasks/leetcode/` is derived from
[`s-cerevisiae/leetcode-racket`](https://github.com/s-cerevisiae/leetcode-racket)
(MIT), via the clone kept in the git-ignored `tmp/`. That clone is a fork, not
the upstream; each task records the upstream repository, file, and clone commit
in its `source` field.
