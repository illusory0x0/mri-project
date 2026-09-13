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
A leaf node: a symbol, a number, or a string.
_Avoid_: literal, token

**List**:
A node with ordered children — a parenthesized form.
_Avoid_: expression, sexp

**Hole**:
An identifier beginning with `_`, marking a position that is visible but not
yet filled. A naming convention, not a validated construct.
_Avoid_: placeholder, blank, underscore

**Path**:
An array of child indices naming exactly one node; the root is `[]`.
_Avoid_: address, coordinate, location, position

**Outline**:
The enumeration of every node with its path and semantic kind, produced so a
caller can choose an edit target.
_Avoid_: tree dump, listing, index

**Shape**:
A named specification that produces a node when expanded: either a skeleton
shape (`lambda`, `if`, `define`, `let`, `apply:<n>`) yielding a list with holes,
or an atom shape (`var:<name>`, `num:<n>`, `str:<s>`) yielding an atom.
_Avoid_: template, macro, constructor

**Skeleton**:
The list produced by expanding a skeleton shape, with named holes standing in
for the children the caller must still fill.
_Avoid_: template, pattern

**Replace**:
The single edit operation: overwrite the node at one path with a shape, a copied
subtree, or a hole.
_Avoid_: update, patch

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

**Construct** (kind axis):
What a task asks the caller to build: `atom`, `wrap`, `build`, `copy`, or
`multi`.
_Avoid_: edit type, operation type

**Scorer**:
The component that parses a candidate program, checks bracket balance,
evaluates it, and compares it against the expected program.
_Avoid_: judge, grader, checker

**Driver**:
The agent backend that runs an arm against a task.
_Avoid_: model, client, runner

**Run**:
One task × arm × driver execution, with its transcript, score, step count, and
token count.
_Avoid_: trial, attempt

**Success@1**:
A run whose single final artifact both evaluates and matches the expected
program.
_Avoid_: accuracy, pass rate
