# lisp-editor

Stateless structural editor for a Lisp subset. It exposes a set of
AST-level operations (outline, replace, hole, ...) through a CLI so that an
agent can edit programs by manipulating structure instead of raw text.

## Setup

```sh
pnpm install
pnpm run build     # compile TypeScript to dist/
pnpm test          # build + run the test suite
```

## Evaluating the topics

The `eval/` harness runs a model against a set of **topics** (tasks) using
several **arms** (editing strategies), then scores the results.

- **Topics** live in `eval/tasks/*.json`. Each task has an `input` program,
  an `expected` program, an `instruction`, and two difficulty labels:
  `locate` (`explicit` / `described`) and `construct`
  (`atom` / `wrap` / `build` / `copy` / `multi`).
- **Arms** live in `eval/arms/*.json`:
  - `direct` — reply with the whole program.
  - `ast-edit` — use the `lisp_editor` structural tool.
  - `text-edit` — use a `shell` tool (bash/sed/awk).
  - `diff` — reply with a unified diff that the harness applies.
- Results are written to `eval/results/`, one JSON file per run plus
  `summary.json`.

### Run against a model

The openai-compatible driver needs a base URL, API key, and model. Set them
as environment variables and invoke the eval script:

```fish
# fish shell
set -gx OPENAI_BASE_URL <url>;
set -gx OPENAI_API_KEY <apikey>;

pnpm run eval \
  --driver openai \
  --base-url $OPENAI_BASE_URL \
  --api-key $OPENAI_API_KEY \
  --model linda/kimi-k2.7-code-highspeed
```

Run `node dist/eval/run.js -h` for the full flag list.

### Read the results

```sh
pnpm run report    # writes eval/report.html to browse runs interactively
```
