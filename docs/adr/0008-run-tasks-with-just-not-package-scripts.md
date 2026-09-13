# Run tasks with `just`, not `package.json` scripts

Status: accepted
Date: 2026-09-14

**Context.** Build, type-check, test, eval, and report were all `npm` scripts in
`package.json`, invoked through `pnpm run <name>`. `pnpm run` pays a Node
bootstrap on every invocation and its completion does not cover recipe names or
arguments well.

**Decision.** Move the task definitions to a root `justfile` and remove the
`scripts` block from `package.json`, leaving it a pure dependency manifest.
`pnpm` remains the package manager (`pnpm install`); `just` runs the tasks.
Because `just` (unlike `npm`/`pnpm`) does not put `node_modules/.bin` on `PATH`,
the justfile prepends it explicitly.

**Why.**

- **Startup.** `just` is a native binary; `pnpm run` spins up Node first.
- **Completion.** `just` ships shell completions for recipe names and (with
  `--list`) documentation; recipe arguments complete too.
- **A real task runner.** Recipe dependencies (`test: build`), parameters and
  variadics (`eval *args`), comments surfaced as `just --list` help,
  `--dry-run`, `--show`, `--choose`, private recipes, dotenv, imports/modules,
  per-OS recipes, and `set shell` pinning. `package.json` scripts are strings
  joined by `&&`.
- **Language-agnostic.** Tasks no longer pretend to be npm metadata, and no
  longer have to re-spell `pnpm run build` inside `test`/`eval`/`report`.
- **Correct argument forwarding.** `just eval --driver openai` forwards flags
  verbatim; `pnpm run eval -- ...` has its own `--` rules.
- **Separation of concerns.** `package.json` becomes only name, version, bin,
  and dependencies; task logic lives in one file that reads like a script.

**Considered options, and why not.**

- **Keep `package.json` scripts** — no new host dependency, but keeps the slow
  runner and the coordination-by-`&&`. Rejected.
- **`make`** — ubiquitous and already a task runner, but its tab-significant,
  target/file semantics and lack of argument forwarding fit this workspace
  worse than `just`'s recipe model.
- **`bun run` / `deno task`** — faster than `pnpm run`, but tie task definitions
  to a runtime the rest of the toolchain does not use.
- **A shell script (`./dev.sh`)** — no discovery, no per-recipe help,
  completion, or dependencies; reinvents `just` badly.
- **`mise` / `task` / `turbo`** — more machinery (toolchain provisioning,
  caching) than this single-package repo needs.

**Tradeoffs accepted.**

- **New host dependency.** `just` (a Rust binary) must be installed and
  version-pinned by hand; there is no lockfile for it. Node/pnpm were already
  required. CI and onboarding must add one more step.
- **`PATH` footgun.** `node_modules/.bin` is no longer injected automatically,
  so bare `esbuild`/`tsc` work only because the justfile exports the path. A
  future recipe that forgets this fails.
- **Lost ecosystem hooks.** Tools that scan `package.json` scripts (the VS Code
  "npm scripts" explorer, `npm-run-all`, publish/release tooling, some CI
  detection, Husky lifecycle hooks) see nothing. There are no `pre`/`post`
  hooks and no `pnpm <script>` shorthand.
- **Muscle memory and external docs.** `pnpm test`/`pnpm build` now do nothing;
  README and issue briefs had to be swept to `just`.
- **Another DSL.** Contributors must learn `just`; its `{{...}}` interpolation
  and variable rules differ from shell.
- **Portability.** Recipes assume `bash`; npm scripts at least run under `cmd`.
  The project was already POSIX-only (`rm -rf`, shell globs), so this is not a
  regression here.

**Consequences.** `just` is required to build/test/eval; `pnpm install` alone is
no longer sufficient setup. `just` with no arguments lists recipes.

**Revisit when.** Windows contributors need first-class support, `just` becomes
a maintenance burden, or a JS-native runner offers the same startup and
completion without the extra dependency.
