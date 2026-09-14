# lisp-editor

Stateless structural editor for a Lisp subset. It exposes a set of
AST-level operations (outline, replace, hole, ...) through a CLI so that an
agent can edit programs by manipulating structure instead of raw text.

## Setup

Tasks are run with [`just`](https://github.com/casey/just); `pnpm` only installs
dependencies.

```sh
pnpm install
just build     # compile TypeScript to dist/
just typecheck # type-check without emitting
just test      # build + run the test suite
just           # list all recipes
```

## Evaluating the tasks

The `eval/` harness runs a model against a set of **tasks** using several
**arms** (editing strategies), then scores the results.

- **Tasks** live in `eval/tasks/*.json`. Each task has an `input` program,
  an `expected` program, an `instruction`, and two difficulty labels:
  `locate` (`explicit` / `described`) and `construct`
  (`atom` / `wrap` / `build` / `copy` / `multi`). A task may also carry a
  `probe` (an expression scored semantically against both programs) and a
  `bracketDanger` flag (its runs are reported in a separate reliability cell
  and excluded from the headline summary). `eval/tasks-orthogonal/` is a 16-task
  subset that crosses `locate` and `construct` (each pair shares the program and
  differs only in the instruction) so a per-`construct` cost is not confounded
  by `locate`; run it with `--tasks eval/tasks-orthogonal`.
  `eval/tasks-leetcode/` is a third set authored from a corpus of real Racket
  LeetCode solutions. Its tasks are *mutate-existing*: `expected` is the
  original solution and `input` is the same program with one seeded edit. They
  carry an `operation` (`replace-node` / `insert-node` / `delete-node` /
  `wrap-node` / `move-subtree`) instead of `construct`, and a `source` object
  recording the upstream repository, file, and commit. Run them with
  `--tasks eval/tasks-leetcode`.
- **Arms** live in `eval/arms/*.json`:
  - `direct` — reply with the whole program.
  - `ast-edit` — use the `lisp_editor` structural tool. Its prompt encourages
    independent edits to be batched into one turn; on the recorded run that cut
    total tokens ≈19% versus one-edit-per-turn (≈26% on `build` tasks).
  - `text-edit` — use a `shell` tool (bash/sed/awk).
  - `diff` — reply with a unified diff that the harness applies.
- Results are written to `eval/results/` (git-ignored), one JSON file per run
  plus `summary.json`. Each run records the driver that produced it, the model
  and temperature actually used, its structural/semantic verdicts, and the
  task's target depth.
- `just summary` derives a compact, committable snapshot under
  `eval/summaries/`: provenance (git commit, task set, model, and content hashes
  of arms, vocabulary, task set, and scorer), per-arm, per-`construct`, and
  per-`operation` aggregates, and batching diagnostics, with no transcripts. The
  snapshot is the durable record; raw results can be pruned. See
  `docs/adr/0010-commit-compact-eval-summaries.md`.

### Run against a model

Put the credentials in a git-ignored `.env` at the repo root:

```sh
OPENAI_BASE_URL=https://<host>/v1
OPENAI_API_KEY=sk-...
```

`just` auto-loads `.env` (`set dotenv-load`), and the openai driver falls back
to those variables, so only the model is required on the command line:

```sh
just eval --driver openai --model linda/kimi-k2.7-code-highspeed
```

Explicit `--base-url` / `--api-key` / `--model` flags override the environment;
`OPENAI_MODEL` is also honoured. To run a command with the same environment
outside `just`, use `dotenv -e .env -- <command>`.

Run `node dist/eval/run.js -h` for the full flag list.

### Trust and scoring

- Every run artifact self-describes the driver that produced it (`mock` or
  `openai`) and the configuration actually used, and the report shows the same
  in a run's request context, so a mock run is never mistaken for a real one.
- The scorer reads and evaluates candidate programs in a namespace loaded with
  the full Racket language, where filesystem, process, network, and environment
  bindings are blocked. A blocked candidate is flagged `ioViolation` instead of
  being scored as an ordinary verdict. This is detection, not a real sandbox —
  see `docs/adr/0009-scored-programs-no-io-guard.md`.
- Scorer verdicts are pinned by a table-driven golden corpus over the whole
  task set, and the patch-application seam has its own boundary tests.

### Read the results

```sh
just report        # writes eval/report.html to browse runs interactively
just summary       # writes a compact snapshot to eval/summaries/ and commits it
```

## Acknowledgements

The LeetCode corpus under `eval/tasks-leetcode/` is derived from
[`s-cerevisiae/leetcode-racket`](https://github.com/s-cerevisiae/leetcode-racket)
(MIT), via the clone kept in the git-ignored `tmp/`. That clone is a fork, not
the upstream; each task records the upstream repository, file, and clone commit
in its `source` field.
