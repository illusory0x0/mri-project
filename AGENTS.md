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
just eval ...   # eval harness; extra args go to run.js
just report     # write the HTML report
just summary    # write a compact snapshot to eval/summaries/
just            # list all recipes
```

Eval credentials live in a git-ignored `.env` (`OPENAI_BASE_URL`,
`OPENAI_API_KEY`); `just` auto-loads it (`set dotenv-load`) and the openai
driver falls back to those variables, so only `--model` is required:

```sh
just eval --driver openai --model <model>
```

Explicit `--base-url` / `--api-key` / `--model` flags override the environment,
and `OPENAI_MODEL` is also honoured. Outside `just`, load the file with
`dotenv -e .env -- <command>`.

Add `--repeats N` to run each task × arm N times. Run
`node dist/eval/run.js -h` for the full flag list.

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
