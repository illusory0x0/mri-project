# leetcode-corpus-tasks — a task set from real Racket solutions

Status: ready-for-agent
Date: 2026-09-14

## Problem Statement

The experiment runs 21 synthetic, deeply nested tasks (plus 16 orthogonal
twins). They isolate `locate`×`construct` well, but they do not look like the
programs an agent would edit for real, and every edit is a few tokens. A second
task set authored from real solutions lets the structural-vs-text comparison be
read on realistic programs: does the editor's advantage survive when the file is
a real algorithm and the edit is one local change?

## Solution

Add a second **Task set**, `eval/tasks-leetcode/`, derived from the **Corpus**
of real Racket LeetCode solutions in `tmp/spore-leetcode-racket/`. A task is
*mutate-existing*: `expected` is the original solution, `input` is the original
with exactly one seeded edit, the instruction describes that edit, and a probe
calls the entry function so the semantic verdict is meaningful. Source is
inlined into the task JSON (no `#lang`), so tasks are self-contained and
reproducible from this repo. The editor is widened just enough to admit the
selected files; modules and metaprogramming stay out.

## Decisions

| # | Decision |
|---|---|
| Q1 | Purpose: realism branch of the existing structural-vs-text experiment, using the corpus as a task mine. |
| Q2 | Task format: mutate-existing (input = seeded solution, expected = original). |
| Q3 | Editor extension: bounded wave — widen parser and add a few shapes; exclude modules/macros/continuations. |
| Q4 | Packaging: inline source into task JSON; record provenance in a `source` field. |
| Q5 | Inventory: booleans, characters, `'…`→`(quote …)`; shapes `letrec`/`and`/`or`/`when`/`unless`/`begin`/named `let`; `match`/`for/*` parse+copy only. |
| Q6 | Kind axis: corpus tasks use **Operation** (`replace-node`/`insert-node`/`delete-node`/`wrap-node`/`move-subtree`); synthetic tasks keep **Construct**. |
| Q7 | Composition: supplement the synthetic sets, do not replace them; summary groups by task set. |
| Q8 | Attribution: README credits upstream `s-cerevisiae/leetcode-racket`; each task records `source`. |
| Q9 | ADR 0011 amends ADR 0007. |
| Q10 | Selection: ~20 self-contained, single-entry files across input types; drop files whose original cannot run. |
| Q11 | Edit mix: keep realistic small edits but label them; deliberately design some structural (`wrap`/`move`/`insert`/`delete`) so the shape vocabulary is exercised. |
| Q12 | Probe: hand-written literal call per task; prefer seeds whose probe output changes, but do not discard structurally-discriminating seeds. |
| Q13 | Granularity: one task per selected file for this wave. |
| Q14 | Order: land the editor extension first, then author the task set. |

## Editor extension (Q5)

**Parser / printer** (`src/parser.ts`, `src/printer.ts`, `src/ast.ts`):

- `'<datum>` (including `'` before a list) is read as `(quote <datum>)`, a
  two-element **List**. `(quote x)` prints canonically as `(quote x)`; because
  the scorer reads both the candidate and the expected with Racket, `(quote x)`
  and `'x` are the same datum and the structural verdict still matches.
- Backquote `` ` `` and `,` / `,@` remain rejected (ADR 0007 stands for them).
- `#t` / `#f` become atoms with tag `boolean` (value stored verbatim, printed
  verbatim).
- `#\<char>` becomes an atom with tag `character`; the tokenizer consumes the
  `#\` prefix plus one following significant unit so `#\(` is a character, not a
  paren, and `#\space` / `#\newline` work.
- `outline` gains kinds `boolean`, `character`, and `quote` (the latter so a
  `(quote …)` node is not mislabelled `apply`).

**Shapes** (`src/ops.ts`), added to `SHAPES` and the error catalogue:

- `letrec` → `(letrec ((_name _value)) _body)`
- `and` → `(and _arg1 _arg2)`
- `or` → `(or _arg1 _arg2)`
- `when` → `(when _cond _body)`
- `unless` → `(unless _cond _body)`
- `begin` → `(begin _body1 _body2)`
- `let-loop` → `(let _loop ((_name _value)) _body)` (named `let`)
- `match` and `for/*` get no shape; they are ordinary lists that can be parsed,
  copied, inserted, and deleted.

The `lisp_editor` tool description in `eval/tools.ts` is updated to match.

## Corpus eligibility (Q10)

From the 95 root files, judged against the subset above:

- **Bucket A — eligible: 50** self-contained files with a clear entry function
  and at least one plausible single edit.
- **Bucket B — weak: 4** (`14`, `215`, `273`, `347`); `14` and `347` reference
  undefined identifiers so the original cannot run — excluded.
- **Bucket C — excluded: 41**: requires `list-node.rkt`/`tree-node.rkt` (27),
  other `require`s, `struct`/`class`, `let/cc`/`shift`, vector or hash literals,
  `define-syntax`, or `module+`.

## Selection (Q10)

Twenty files, chosen for input-type diversity and a mix of operations. Seeds are
the authoring ticket's starting point; the exact edit and `operation` label are
finalised there (a handful are converted to structural operations to satisfy
Q11).

| File | Entry | Inputs | Operation (target) | Seed direction |
|---|---|---|---|---|
| `151-reverse-words-in-a-string.rkt` | `reverse-words/1` | string | delete-node | remove the `reverse` call |
| `274-h-index.rkt` | `h-index/1` | list[int] | replace-node | `>` → `>=` |
| `62-unique-paths.rkt` | `unique-paths/2` | int,int | replace-node | `/` → `*` |
| `50-powx-n.rkt` | `my-pow/2` | number,int | replace-node | swap `/` and `*` |
| `179-largest-number.rkt` | `largest-number/1` | list[int] | replace-node | `>` → `<` |
| `1899-merge-triplets-to-form-target-triplet.rkt` | `merge-triplets/2` | list[list[int]],list[int] | replace-node | `max` → `min` |
| `198-house-robber.rkt` | `rob/1` | list[int] | replace-node | `p2` → `p1` |
| `135-candy.rkt` | `candy/1` | list[int] | replace-node | `max` → `min` |
| `1035-uncrossed-lines.rkt` | `max-uncrossed-lines/2` | list[int],list[int] | replace-node | `d1` → `d2` |
| `72-edit-distance.rkt` | `min-distance/2` | string,string | delete-node | drop `+ 1` |
| `645-set-mismatch.rkt` | `find-error-nums/1` | list[int] | move-subtree | swap the two returned terms |
| `207-course-schedule.rkt` | `can-finish/2` | int,list[pair] | replace-node | `for/and` → `for/or` |
| `785-is-graph-bipartite.rkt` | `is-bipartite/1` | list[list[int]] | delete-node | `(- to-tag)` → `to-tag` |
| `997-find-the-town-judge.rkt` | `find-judge/2` | int,list[pair] | replace-node | `(- n 1)` → `n` |
| `200-number-of-islands.rkt` | `num-islands/1` | list[list[char]] | replace-node | final `1` → `0` |
| `797-all-paths-from-source-to-target.rkt` | `all-paths-source-target/1` | list[list[int]] | replace-node | `null?` → `pair?` |
| `458-poor-pigs.rkt` | `poor-pigs/3` | int,int,int | replace-node | `(+ 1 …)` → `(+ 2 …)` |
| `1310-xor-queries-of-a-subarray.rkt` | `xor-queries/2` | list[int],list[pair] | replace-node | `bitwise-xor` → `bitwise-and` |
| `55-jump-game.rkt` | `can-jump/1` | list[int] | replace-node | `<` → `>` |
| `525-contiguous-array.rkt` | `find-max-length/1` | list[int] | replace-node | `(= n 1)` → `(= n 0)` |

## Task format

The corpus task adds `operation` and `source` to the existing **Task**:

```json
{
  "id": "lc151-reverse-words",
  "locate": "described",
  "operation": "delete-node",
  "instruction": "In reverse-words, remove the reverse call so the words keep their original order.",
  "input": "(define (reverse-words s)\n  (string-join\n    (string-split s)))",
  "expected": "(define (reverse-words s)\n  (string-join\n    (reverse\n      (string-split s))))",
  "probe": "(reverse-words \"the sky is blue\")",
  "source": {
    "repo": "https://github.com/s-cerevisiae/leetcode-racket",
    "file": "151-reverse-words-in-a-string.rkt",
    "commit": "<fork commit, e.g. 7aed964>"
  }
}
```

`construct` becomes optional on **Task**; `operation` is optional and set only
for corpus tasks. `locate` (`explicit`/`described`) still applies: `explicit`
names the path or the targeted expression, `described` refers to it by role.
`bracketDanger` stays optional. Source is inlined without the `#lang` line.

### Probe policy (Q12)

- Every corpus task carries a probe: a literal call to the entry function on a
  small, terminating input.
- Prefer a seed whose probe output differs between `input` and `expected`, so
  the semantic verdict discriminates. Where a seed is structurally
  discriminating but semantically silent, keep it and say so in the task.
- The scorer already treats non-termination as `unknown`; no new budget.

## Attribution (Q8)

- README gains an **Acknowledgements** section:

  > The LeetCode corpus under `eval/tasks-leetcode/` is derived from
  > [`s-cerevisiae/leetcode-racket`](https://github.com/s-cerevisiae/leetcode-racket)
  > (MIT), via the clone kept in the git-ignored `tmp/`. Each task records the
  > upstream repository, file, and commit in its `source` field.

- The `tmp/` clone is a fork, not the upstream; the acknowledgement names the
  upstream, and `source.commit` records the clone commit actually read.

## Out of Scope

- `require`, `provide`, `struct`, `class`, `define-syntax`, `shift`/`reset`,
  `let/cc`, `module+`, vector literals, hash literals.
- Backquote and unquote.
- Auto-deriving tasks from the corpus; every task is hand-authored.
- LeetCode's official sample inputs/outputs (not present in the corpus).
- Helper modules `list-node.rkt` / `tree-node.rkt` and the tree/linked-list
  task families that need them.
- Preserving `#lang` or comments.

## Testing Decisions

- The editor extension is tested at the existing CLI seam: `'x`, `'(a b)`,
  `#t`, `#\a`, `#\space`, and each new shape, asserting stdout and exit status.
- The scorer's golden corpus is extended so quote/boolean/character round-trips
  parse, print, and evaluate, and so a `(quote …)` candidate matches a `'…`
  expected program structurally.
- The corpus task set is checked by loading every task and asserting each
  `expected` scores structurally equal and (where a probe exists) semantically
  `equal`, each `input` diverges, and every `source` field is present.
- `just typecheck` and `just test` pass.

## See Also

- `docs/adr/0007-purely-syntactic-no-semantics.md` (amended)
- `docs/adr/0011-widen-subset-for-corpus-tasks.md`
- `docs/spec.md` (product spec)
- `CONTEXT.md` (`Corpus`, `Task set`, `Operation`)
