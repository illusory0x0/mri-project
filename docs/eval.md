# Eval harness

How to run the eval harness: credentials, flag precedence, and repeats. The
command list and required tools live in [`AGENTS.md`](../AGENTS.md); this doc
holds the longer detail.

## Credentials

Eval credentials live in a git-ignored `.env` (`OPENAI_BASE_URL`,
`OPENAI_API_KEY`); `just` auto-loads it (`set dotenv-load`) and `eval/options.ts`
falls back to those variables, so only `--model` is required:

```sh
just eval --driver openai --model <model>
```

## Flag precedence

Explicit `--base-url` / `--api-key` / `--model` flags override the environment,
and `OPENAI_MODEL` is also honoured. The fallback is applied in
`eval/options.ts` (`applyEnvFallbacks`), not in `src/cli.ts` — the `lisp-editor`
CLI does not read these (or any) environment variables.

Outside `just`, load the file with `dotenv -e .env -- <command>`.

## Repeats

Add `--repeats N` to run each task × arm N times. Run
`node dist/eval/run.js -h` for the full flag list.
