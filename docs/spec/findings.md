# Findings

What the runs have shown so far, plus directions deliberately not taken. These
are directional, single-sample observations unless stated otherwise; the durable
record is the committed snapshots under `eval/summaries/` (ADR 0010).

The findings are grouped by weight: **key findings** shape the experiment's
central claims; **supporting observations** are narrower or methodological;
**notes** record deferred directions and implementation changes.

## Key findings

### The headline metric is effort and expressiveness, not bracket safety

Because all construction goes through shapes and parameterized atoms and all
output goes through the deterministic printer, the `ast-edit` arm has essentially
zero bracket mismatches by construction. Rather than claim a victory there, the
experiment takes the primary claim to be step / token cost and success (is the
vocabulary expressive enough to reach the expected program?), and reports bracket
mismatch as a separate reliability cell over a few deliberately bracket-dangerous
tasks.

### On real code, structure is more accurate but far costlier

The first LeetCode run (`linda/kimi-k2.7-code-highspeed` at temperature 1, the 20
corpus tasks × 4 arms) put `ast-edit` at the top on success (0.70) and semantic
equivalence (0.90 of 20) — but at a mean ≈17.2k tokens per run, roughly 9× the
`direct` arm (≈1.9k) and 4× `text-edit` (≈4.0k); `diff` ran 0.60 / 0.93 (15
scored) at ≈5.4k. Failures concentrated in the 14 `replace-node` tasks (all arms
0.50–0.64), and `ast-edit` missed the single `insert-node` task while spending
≈30k tokens on it.

Directionally: the synthetic set's "structure is cheaper" story does not transfer
to real, shallow code. Structural editing buys correctness and semantic fidelity
here, not effort — exactly what the realism branch was added to test. This is one
model, one temperature, n = 1 per task × arm.

### The `direct` arm is an ideal upper bound, not a deployable approach

After fixing six LeetCode tasks with reversed input/expected, the post-fix run
(`linda/kimi-k2.7-code-highspeed` at temperature 1, 57 tasks × 4 arms) put
`direct` and `ast-edit` level at 0.96 success. But `direct` only works because
every task's input program is short enough for the model to rewrite in one turn.
A real codebase file runs to hundreds or thousands of lines; the model cannot
emit the complete file in a single response, so `direct` does not scale. It
functions as an ideal ceiling — the success rate the other arms are measured
against.

The arms that do scale to real codebases are `diff` (unified diff applied by GNU
`patch`) and `text-edit` (shell edits to `program.rkt`), and these are the two
weakest: `text-edit` at 0.87 and `diff` at 0.88. `diff` accumulates hunk
failures — the model's patch context does not match the file, so `patch` refuses
to apply and the program is left unchanged. The structural editor (`ast-edit`)
proves that targeted edits eliminate the drift that text arms suffer (zero
bracket mismatches, zero extra-arg drift like `lc-43`'s spurious `make-vector`
argument), but `lisp_editor` only operates on a single Lisp program's tree — it
does not generalize to multi-file or non-Lisp codebases.

The gap between the ideal ceiling (0.96) and the deployable arms (0.87–0.88) is
the open problem this experiment surfaces.

## Supporting observations

### `locate` and `construct` interact

The original Basic set was not crossed (`multi` was 100% `explicit`; `atom`/`wrap`
100% `described`), so a per-`construct` cost could be a `locate` effect. The
Orthogonal set adds 16 twin tasks (four constructs × both locates × 2). On
kimi-k2.7-code-highspeed at temperature 1, `ast-edit` tokens per cell
(`explicit` / `described`) were: atom 5.2k / 5.0k, wrap 7.6k / 5.2k, build
9.6k / 8.5k, multi 9.1k / 28.6k. The `locate` effect is strongly
construct-dependent (negligible for `atom`, ≈3× for `multi`), so no
locate-independent construct ordering survives. The `multi`-`described` cell is
dominated by one task (`o07-deep-let-described`, 44k tokens) and every cell has
n = 2, so this is a directional signal, not a measured effect.

### Batched edits cut `ast-edit` cost

The `ast-edit` prompt lets the model put independent `lisp_editor` edits in a
single assistant turn while keeping path-dependent edits (after an insert, delete,
or list replace) separate. On kimi-k2.7-code-highspeed at temperature 1,
`ast-edit` total tokens over the 21 Basic tasks fell from 337k to 272k (≈19%),
concentrated in `build` (215k → 159k, ≈26%) and `wrap` (41k → 33k, ≈20%);
commands per turn rose from 1.07 to 1.67. An earlier revision without the
hole-targeting hint saved more tokens (263k) but regressed one `build` task by
replacing a parameter list with an atom; the hint restores full success. The
`multi` saving is not robust.

### Reliability cell

The bracket-danger cell retains the original multi-line tasks and adds nesting-
and size-driven ones. The first real-model run produced a genuine bracket mismatch
for the `diff` arm on the deepest task. The cell's parse-error and bracket-mismatch
rates are summarized separately from the headline (which excludes the cell's
tasks).

## Notes

### Future direction: a custom benchmark language

A more stable benchmark would replace Racket with a purpose-built, Lisp-style ML
language whose syntax and evaluation are fully specified, so scoring no longer
depends on Racket's reader (and on how much of `racket` the scorer must load, see
ADR 0009). This is deliberately low-priority: the cost is high (agents are
unfamiliar with a new language, and teaching it in the system prompt consumes
tokens), so it is recorded as a direction, not committed work.

### Prompt note: tool shape list is generated

The `lisp_editor` tool description's shape list is now generated from the
editor's `SHAPES` catalogue (`src/ops.ts`), not hand-written in the description.
Existing committed snapshots are historical: they predate the generation and
remain valid; the generated list is byte-identical to the hand-written one, so
no re-run is required.
