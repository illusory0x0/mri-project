import { SHAPES } from "../src/ops.js";
import { printFlat } from "../src/printer.js";
import { ToolSpec } from "./types.js";

const SHAPE_NOTES: Record<string, string> = {
  "define-fn": ", a function header",
  "let-loop": ", a named let",
  list: ", a general two-element list of holes",
  hole: " (a visible placeholder)",
};

function shapeCatalogue(): string {
  const names = Object.keys(SHAPES);
  const applyEntry =
    "apply:<n> -> (_func _arg1 ... _argn), a list of n+1 elements (the head plus n argument holes), e.g. apply:2 -> (_func _arg1 _arg2)";
  const entries: string[] = [];
  for (const name of names) {
    if (name === "hole") entries.push(applyEntry);
    const printed = printFlat(SHAPES[name]);
    const note = SHAPE_NOTES[name] ?? "";
    entries.push(`${name} -> ${printed}${note}`);
  }
  return entries.join("; ");
}

function shapeSection(): string {
  return (
    "Shapes: " +
    shapeCatalogue() +
    ". Forms without a shape, such as match and for/*, are ordinary lists: they parse, copy, move, insert, and delete like any other list, but cannot be constructed from a skeleton.\n"
  );
}

export const TOOL_SPECS: Record<string, ToolSpec> = {
  lisp_editor: {
    name: "lisp_editor",
    description:
      "Edit the current Lisp program by AST path. `args` is the full argument list to the lisp-editor CLI. The current program is fed on stdin and the edited program is returned on success.\n" +
      "Commands:\n" +
      "- [\"outline\"] lists every node as {path, kind, ...}. kind is the semantic construct: \"define\", \"lambda\", \"let\", \"let*\", \"if\", \"cond\", \"quote\" for special forms; \"apply\" (with a head field naming the operator) for other symbol-headed lists; \"list\" for skeletons and data lists; \"symbol\", \"number\", \"string\", \"boolean\", \"character\", or \"hole\" (with a value field) for atoms. Call this first to find paths.\n" +
      "- [\"replace\", \"<shape>\", \"--out\", \"<path>\"] replaces the node at <path> with a shape skeleton.\n" +
      "- [\"replace\", \"--in\", \"<srcPath>\", \"--out\", \"<dstPath>\"] copies an existing subtree.\n" +
      "- [\"delete\", \"--out\", \"<path>\"] removes the node at <path> by splicing it out of its parent list, so the list gets shorter. The root cannot be deleted and the parent must be a list.\n" +
      "- [\"insert\", \"<shape>\", \"--into\", \"<path>\", \"--at\", \"<index>\"] inserts the shape's node before child <index> of the list at <path>; <index> may equal the list's length to append.\n" +
      "- [\"insert\", \"--in\", \"<srcPath>\", \"--into\", \"<path>\", \"--at\", \"<index>\"] copies an existing subtree into the list at <path> before child <index>.\n" +
      "A path is a JSON array of child indices, e.g. [0,2,1]; the root is []. The root is the program's list of top-level forms, so insert into [] adds a top-level form and an empty program can be bootstrapped with insert <shape> --into [] --at 0.\n" +
      shapeSection() +
      "To build an n-argument form such as (+ x 1), use replace apply:2 then fill _func=var:+, _arg1=var:x, _arg2=num:1. To change an operator in place, replace the list's first child (the head atom), whose path is the list path plus a trailing 0, e.g. to change (+ z y) at [0,2,2,2] into (- z y) run replace var:- --out [0,2,2,2,0].\n" +
      "replace discards the node at --out, so there is no atomic wrap: to wrap a node in a new form, first copy it out with replace --in <path> --out <tmpPath>, then replace <path> with the wrapper shape and copy the node back into the wrapper's hole. Overwriting <path> before copying loses the original.\n" +
      "Atoms: var:<name> e.g. var:x or var:+; num:<n> e.g. num:1 or num:-2.5; str:<s> e.g. str:hello world.\n" +
      "Any invalid request exits non-zero and leaves the program unchanged, so a failed edit can be retried.",
    parameters: {
      type: "object",
      properties: {
        args: { type: "array", items: { type: "string" } },
      },
      required: ["args"],
    },
  },
  shell: {
    name: "shell",
    description:
      "Run a bash command in a temporary directory that contains the current program as program.rkt. Use sed, awk, or ordinary file edits to modify program.rkt in place. Returns stdout, stderr, and the exit code.",
    parameters: {
      type: "object",
      properties: { command: { type: "string" } },
      required: ["command"],
    },
  },
};
