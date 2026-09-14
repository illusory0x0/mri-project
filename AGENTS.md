# AGENTS.md

## Commands

Tasks live in `justfile` and are run with `just`, not `pnpm run`. `pnpm` is only
for `pnpm install`.

- `just build` — compile `src/`, `eval/`, `test/` to `dist/`
- `just typecheck` — `tsc --noEmit` plus the DOM client project
- `just test` — build, then run the Node test suite
- `just eval ...` / `just report` — eval harness and HTML report
- `just` — list all recipes

Eval credentials live in a git-ignored `.env` (`OPENAI_BASE_URL`,
`OPENAI_API_KEY`); `just` auto-loads it (`set dotenv-load`) and the openai
driver falls back to those variables, so only `--model` is required on the
command line. Outside `just`, load it with `dotenv -e .env -- <command>`.

The test suite shells out to `racket` (the scorer) and GNU `patch` (the diff
seam); both must be on `PATH`.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root plus `docs/adr/`. See `docs/agents/domain.md`.
