# 20: Revisit shape/atom expressiveness (vocabulary v2)

**What to build:** Act on the first real-model experiment data and decide the
next revision of the `lisp-editor` shape vocabulary. `docs/spec.md` deferred this
review "until the first experiment data exists"; it now does (kimi-k2.7-code-highspeed
and qwen3.5-35b-a3b runs).

**Blocked by:** Re-run needs model API access (cost/expressiveness comparison)

**Status:** ready-for-human

## Evidence from the first real-model runs

- **Visibility ≠ constructibility.** `outline` classifies `cond`, `let*`, and
  plain `list` nodes (`src/ops.ts:175-195`), but the shape catalogue has no
  `cond`, `let*`, or `list` shape (`src/ops.ts:21-31`). A task that must *build*
  one cannot be served by `replace`; today `t07-cond` only passes because it
  mutates an existing atom.
- **No function-`define` shape.** `define` is `(define _name _body)` only, so the
  canonical header `(define (square x) ...)` cannot be built without abusing
  `apply:1` to fake a parameter list (which treats a call node as a parameter
  list). `t18-bootstrap` failed this way for both models: semantic `equal`,
  structural `false`.
- **No atomic `wrap`.** `replace` discards the node at `--out`, so wrapping a
  compound body in a new form (`t13-wrap-let`) forces either a rebuild-from-scratch
  or a copy-to-a-temp dance. The kimi run took 19 steps / 61k tokens for t13; the
  qwen run exhausted its 25-step budget and left a skeleton behind.
- **Cost is concentrated in `build`.** Per-`construct` ast-edit steps:
  `atom` 2.0, `copy` 2.0, `multi` 3.3, `wrap` 6.0, **`build` 11.8** (tails to 23).
  The arm-level mean (~5) hides this.

## Tasks

- [x] Decide which shapes to add: **adopt all four** — `cond`, `let*`, `list`,
      and `define-fn`. Each closes a gap where `outline` already classified a
      construct no shape could build (or, for `define-fn`, where the canonical
      function header could not be built).
- [x] Decide whether to add an atomic `wrap`/transform verb: **no** — keep the
      one-node-per-call model and document the copy-before-overwrite order in
      `eval/tools.ts` and `docs/spec.md`.
- [x] Weigh both against the experiment premise that the vocabulary itself is the
      variable under test: recorded in `docs/spec.md` ("Vocabulary v2 adopted").
- [x] Implemented the four shapes in `src/ops.ts`; updated the catalogue in
      `eval/tools.ts` and `docs/spec.md`; covered by `test/replace.test.ts` and
      `test/outline.test.ts`.
- [ ] **Pending:** re-run the experiment to compare cost and expressiveness
      against v1 (needs model API access).
- [ ] Consider splitting the report cost summary by `construct` (deferred
      decision; evidence above).

## Comments

Vocabulary v2 was adopted without re-arguing the experiment premise: the added
shapes are constructor gaps, not a change to how effort is measured, so v2 runs
can be compared against the recorded v1 runs per `construct`. The atomic-`wrap`
question is settled as "no" for now. The only outstanding work is the re-run.
