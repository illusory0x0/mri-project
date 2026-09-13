# 20: Revisit shape/atom expressiveness (vocabulary v2)

**What to build:** Act on the first real-model experiment data and decide the
next revision of the `lisp-editor` shape vocabulary. `docs/spec.md` deferred this
review "until the first experiment data exists"; it now does (kimi-k2.7-code-highspeed
and qwen3.5-35b-a3b runs).

**Blocked by:** None

**Status:** ready-for-agent

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

- [ ] Decide which shapes to add: `cond`, `let*`, `list`, and/or a
      function-`define` (`define-fn`) shape.
- [ ] Decide whether to add an atomic `wrap`/transform verb, versus keeping the
      one-node-per-call model and documenting the copy-before-overwrite order.
- [ ] Weigh both against the experiment premise that the vocabulary itself is the
      variable under test (`docs/spec.md`, "headline metric is effort and
      expressiveness").
- [ ] If adopted: implement in `src/ops.ts`, update the shape catalogue in
      `eval/tools.ts` and `docs/spec.md`, and re-run to compare cost and
      expressiveness.
- [ ] Consider splitting the report cost summary by `construct` (deferred
      decision; evidence above).
