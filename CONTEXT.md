# lisp-editor

A stateless structural editor for a Lisp subset, and the experiment that tests
whether editing a program through its structure is more reliable and cheaper
than editing its text.

## Language

**Structural editor**:
A tool that edits a program by mutating its tree rather than its characters.
_Avoid_: AST editor, code editor, syntax editor

**Node**:
One element of the program tree: either an atom or a list.
_Avoid_: expression, term

**Atom**:
A leaf node: a symbol, a number, a string, a boolean, or a character.
_Avoid_: literal, token

**List**:
A node with ordered children — a parenthesized form.
_Avoid_: expression, sexp

**Hole**:
An identifier beginning with `_`, marking a position that is visible but not
yet filled. A naming convention, not a validated construct, and not a deletion.
_Avoid_: placeholder, blank, underscore, delete

**Path**:
An array of child indices naming exactly one node; the root is `[]`.
_Avoid_: address, coordinate, location, position

**Outline**:
The enumeration of every node with its path and semantic kind, produced so a
caller can choose an edit target.
_Avoid_: tree dump, listing, index

**Shape**:
A named specification that produces a node when expanded: either a skeleton
shape (`lambda`, `if`, `define`, `define-fn`, `let`, `let*`, `cond`, `list`,
`apply:<n>`) yielding a list with holes, or an atom shape (`var:<name>`,
`num:<n>`, `str:<s>`, `hole`) yielding an atom.
_Avoid_: template, macro, constructor

**Skeleton**:
The list produced by expanding a skeleton shape, with named holes standing in
for the children the caller must still fill.
_Avoid_: template, pattern

**Replace**:
The edit operation that overwrites the node at one path with a shape, a copied
subtree, or a hole.
_Avoid_: update, patch

**Delete**:
The edit operation that removes a node by splicing it out of its parent list.
The root cannot be deleted.
_Avoid_: remove, drop, cut

**Insert**:
The edit operation that places a new node — from a shape or a copied subtree —
at a chosen index in a list. Adding a top-level form is insertion into the root.
_Avoid_: add, append

**Corpus**:
An imported body of real programs used as raw material for authoring tasks; it
is not itself run.
_Avoid_: dataset, fixtures, task set

**Task set**:
A named collection of tasks that are run together.
_Avoid_: suite, benchmark, collection, corpus

**Task**:
One editing problem in the experiment: an input program, an instruction, an
expected program, and two difficulty labels.
_Avoid_: topic, case, problem, item

**Arm**:
One editing strategy under test, run against every task.
_Avoid_: strategy, condition, treatment

**Locate** (difficulty axis):
How a task names its target: `explicit` (the expression is spelled out) or
`described` (a natural-language reference must be resolved).
_Avoid_: reference, addressing, search

**Construct** (kind axis, synthetic tasks):
What a task asks the caller to build: `atom`, `wrap`, `build`, `copy`, or
`multi`.
_Avoid_: edit type, operation type

**Operation** (kind axis, corpus tasks):
What an edit does to the corpus program: `replace-node`, `insert-node`,
`delete-node`, `wrap-node`, or `move-subtree`.
_Avoid_: edit type, action, construct

**Scorer**:
The component that parses a candidate program, checks bracket balance,
evaluates it, and compares it against the expected program.
_Avoid_: judge, grader, checker

**Probe**:
A task-declared expression evaluated against both a candidate and the expected
program to decide semantic equivalence.
_Avoid_: test, check

**Semantic equivalence**:
Two programs are semantically equivalent when the task's probe yields the same
result for both. General program equivalence is undecidable; only the probe is
compared.
_Avoid_: behavioral equality

**Unknown** (semantic verdict):
Recorded when a side does not terminate within the step budget, or cannot be read
at all; excluded from the semantic denominator.
_Avoid_: timeout, failure

**Driver**:
The agent backend that runs an arm against a task.
_Avoid_: model, client, runner

**Target depth**:
The nesting depth a task's edit targets: the depth of the first node where the
input and expected programs diverge. When the edit changes a list's child count
(an insert or a delete) the divergence is reported at the containing list's
depth — one less than the added or removed node's depth.
_Avoid_: edit depth, nesting level

**Run**:
One task × arm × driver execution, with its transcript, score, step count, and
token count.
_Avoid_: trial, attempt

**Step**:
One conversation round in a run: a single request/response turn to the model,
including the final confirmation turn. Issuing several tool calls in one turn
does not change the step count; tool calls and commands per turn are recorded
separately.
_Avoid_: tool call, command

**Success**:
A run judged on its single final artifact, reported twice: structurally (the
candidate and expected parse to the same datum sequence) and semantically (the
task's probe yields the same result for both). A semantically equivalent but
non-canonical answer is a structural miss, not a failure. The harness also
records a single boolean `success` (structurally equal **and** evaluates) as an
internal gate; it is not the headline verdict.
_Avoid_: accuracy, pass rate, success@1
