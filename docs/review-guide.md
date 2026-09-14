# Review guide — where human attention pays off

This is a map for a human reviewing this repo. It ranks the documents and code by
how much a careful read matters, and names the places where a review should *not*
spend time. It is an orientation aid, not a spec; the spec is under
[`docs/spec/`](./spec/README.md) and decisions under [`docs/adr/`](./adr/).

The ranking assumes the reviewer's goal is to catch *wrong decisions, wrong
claims, and load-bearing mistakes*, not typos.

## Tier 1 — load-bearing; review before trusting the result

These encode the experiment's meaning. A mistake here invalidates everything
downstream, so they deserve a slow, adversarial read.

### Documents

- **`CONTEXT.md`** — the vocabulary. Every spec, snapshot, and test name keys
  off these definitions (Run, Repeat, Step, Success, Locate, Construct,
  Target depth, Unknown). If a term here is vague or wrong, the whole
  experiment inherits the ambiguity. Review for: definitions that are
  operational (measurable) vs. aspirational, and the `_Avoid_` lists that
  prevent drift.
- **`docs/spec/README.md` + `editor.md` / `harness.md` / `tasks.md` /
  `findings.md`** — the canonical contract. Read `findings.md` last and most
  skeptically: it turns single-sample observations into directional claims, and
  each claim should be traceable to a committed snapshot under
  `eval/summaries/`. The spec also records testing seams and out-of-scope
  decisions — check that the code actually honors them.
- **ADRs 0005, 0007 + 0011, 0009, 0010, 0012** — the decisions with the widest
  blast radius:
  - `0005` stateless path edits (defines the whole interaction model),
  - `0007`/`0011` purely syntactic editor and the widened subset (defines what
    programs can enter at all),
  - `0009` detection-only I/O guard (an explicit accepted risk — verify the
    consequences are stated honestly),
  - `0010` committed snapshots (defines the durable evidence and pruning
    policy),
  - `0012` task sets and repeats (defines what a run covers).

### Code

- **`src/parser.ts`** — the language boundary. Everything the tool can edit
  must survive this. Review the delimiters (`isDelimiter`, parser.ts:13), the
  quote normalization (parser.ts:200-207), the backquote/unquote rejection
  (parser.ts:77-81), and character/boolean/number classification
  (parser.ts:142-185). A too-loose reader silently mis-edits; a too-strict one
  silently excludes valid tasks.
- **`src/printer.ts`** — determinism is a load-bearing claim (paths must be
  reproducible; the scorer compares canonical output). Review the 80-column
  heuristic (printer.ts:41-79): it must be total, deterministic, and always
  re-parse to the same AST. This is the only place text is produced for the
  editor.
- **`src/ops.ts`** — the edit vocabulary and atomicity. Review the shape
  catalogue (ops.ts:21-63), path resolution and the copy-on-write edit helpers
  (ops.ts:119-192), and the outline classifier (ops.ts:194-227). The known
  drift — forms that have a shape but outline as `apply` — is acknowledged in
  `editor.md` and has an open ticket; confirm that is a conscious choice.
- **`eval/score.rkt`** — the verdict. This is where "success" is actually
  decided. Review the semantic comparison (score.rkt:95-100), the time budget
  and `unknown` handling (score.rkt:61-70), and the I/O guard
  (score.rkt:16-35). A bug here changes every reported number. Pair it with
  `eval/scorer.ts` (process seam) and the golden corpus tests.
- **`eval/runner.ts`** — arm semantics. Review `buildToolContext`
  (runner.ts:56-91, what the `lisp_editor` / `shell` tools actually do),
  `runOne` (runner.ts:129-258, timeout, diff application, what counts as the
  final artifact per arm), and the summarizers (runner.ts:325-406, how
  bracket-danger tasks are excluded from the headline).

## Tier 2 — high-value, but more mechanical

Review these for correctness and consistency once Tier 1 holds.

- **`src/cli.ts`** — argument parsing and the atomicity promise (a failed
  request leaves source unchanged). The per-command mutual-exclusion checks are
  easy to get subtly wrong (cli.ts:90-188).
- **`src/ast.ts`** — `isNumberLiteral`, `isValidSymbol`, `isHole`. Small, but
  they define the atom boundary the parser and shapes both rely on.
- **`eval/tools.ts`** — this is not documentation; it is the agent-facing
  prompt for the `lisp_editor` tool (tools.ts:6-20). Review it as experimental
  treatment, because its wording changes model behavior and token cost. The
  shape list here is duplicated from `src/ops.ts`; an open ticket tracks
  generating it. Until then, verify the two agree.
- **`eval/arms/*.json`** — the four system prompts are the independent
  variable. Treat wording changes as changes to the experiment.
- **`eval/drivers/openai.ts`** — the real-driver path. Review retry policy
  (openai.ts:62-64, 113-145), `extractCodeBlock` (openai.ts:28-31), and the
  unbounded history growth (openai.ts:103-149 re-sends full history each step;
  noted as a token-cost hotspot).
- **`eval/summary.ts`** — snapshot construction and provenance. Review the
  content hashes (summary.ts:129-152) and the aggregation/ordering logic,
  since a snapshot is the durable record a decision cites.
- **`eval/options.ts`, `run.ts`, `verdict.ts`, `depth.ts`, `patch.ts`,
  `process.ts`, `types.ts`** — supporting logic; review when the area is in
  play.

## Tier 3 — generated or derived; skim, do not line-review

- **`eval/report.html`**, **`eval/report.ts`**, **`eval/report.client.ts`** —
  a read-only interactive view. The client is ~730 lines and currently has no
  direct tests (see the test-suite spec below); review behavior from the page,
  not line by line.
- **`eval/results/*.json`** — git-ignored raw run artifacts. Evidence, not
  source.
- **`eval/summaries/*.json`** — committed snapshots of `just summary`; must be
  regenerated, never hand-edited (ADR 0010). Read for the claims they support,
  not for style.
- **`eval/tasks/**/*.json`** — task fixtures. Review a sample for
  `input`/`expected`/`instruction`/`probe` quality; the corpus tests already
  pin that `expected` scores equal and `input` diverges.
- **`dist/`** — build output.

## Reference material — valuable, but already distilled

- **`research/structured-editing-and-ai.md`** — primary-source survey (37
  sources) grounding the project's framing. Do not re-derive it; if you need a
  claim, check it here first. The `.zh.md` file is a translation.
- **`research/inspiration.md`** — a raw link list (ProjecturEd, MoonBit,
  Future of Programming Lab). It is a reading list, not a curated argument.
- **`.scratch/**`** — the issue workbench. Per
  [`docs/agents/issue-tracker.md`](./agents/issue-tracker.md), completed
  tickets are deliberately disposable; do not treat them as durable docs.

## Gaps a reviewer should not assume are covered

The honest weak spots are collected in
`.scratch/test-suite-improvements/spec.md`. In short: the golden corpus uses
`task.input` as the "known-wrong" candidate for most Basic tasks (so it does
not prove the probe discriminates), the report layer is untested, the default
is a single repeat (`n = 1`), and the committed findings are directional rather
than measured. Treat any `findings.md` claim as single-sample unless it cites a
snapshot with `--repeats`.

## Suggested review order

1. `CONTEXT.md` → then one ADR at a time (Tier 1 list).
2. `docs/spec/editor.md` alongside `src/parser.ts` + `src/printer.ts` +
   `src/ops.ts` as one unit.
3. `docs/spec/harness.md` alongside `eval/runner.ts` + `eval/score.rkt` +
   `eval/scorer.ts`.
4. `docs/spec/tasks.md` alongside a sample of the task fixtures and the
   task-set tests.
5. `docs/spec/findings.md` last, checking each claim against
   `eval/summaries/`.
