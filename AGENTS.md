# AGENTS.md

This is the agent's README. It is the project's entry point and the single
authoritative home of operational knowledge. The documentation map — which doc
owns what — is in [`docs/README.md`](docs/README.md).

## Commands

Tasks live in `justfile` and are run with `just`, not `pnpm run`. `pnpm` is only
for installing dependencies.

```sh
pnpm install    # install dependencies
just build      # compile `src/`, `eval/`, `test/` to `dist/`
just typecheck  # `tsc --noEmit` plus the DOM client project
just test       # build, then run the Node test suite
just            # list all recipes
```

### lisp-editor

The `lisp-editor` binary is built from `src/cli.ts`. It reads Lisp source from
stdin or `--file` and performs structural edits on the AST. It does not read
environment variables; all configuration is passed via command-line arguments.
Run `lisp-editor --help` for usage.

### Eval harness

```sh
just eval ...   # eval harness; extra args go to run.js
just report     # write the HTML report
just summary    # write a compact snapshot to eval/summaries/
```

Credentials, flag precedence, `--repeats`, and running outside `just` are
documented in [`docs/eval.md`](docs/eval.md).

The test suite shells out to `racket` (the scorer) and GNU `patch` (the diff
seam); both must be on `PATH`.

## Project map

- [`docs/README.md`](docs/README.md) — the documentation map (which doc owns
  what).
- [`CONTEXT.md`](CONTEXT.md) — the vocabulary.
- [`docs/spec/`](docs/spec/README.md) — product behavior and design.
- [`docs/adr/`](docs/adr/) — decisions.
- [`docs/review-guide.md`](docs/review-guide.md) — where a human should focus
  review.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root plus `docs/adr/`. See `docs/agents/domain.md`.
