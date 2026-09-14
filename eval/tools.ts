import { ToolSpec } from "./types.js";

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
      "Shapes: lambda -> (lambda (_param) _body); if -> (if _cond _then _else); define -> (define _name _body); define-fn -> (define (_name _param) _body), a function header; let -> (let ((_name _value)) _body); let* -> (let* ((_name _value)) _body); letrec -> (letrec ((_name _value)) _body); let-loop -> (let _loop ((_name _value)) _body), a named let; cond -> (cond (_test1 _body1) (_test2 _body2)); and -> (and _arg1 _arg2); or -> (or _arg1 _arg2); when -> (when _cond _body); unless -> (unless _cond _body); begin -> (begin _body1 _body2); list -> (_item1 _item2), a general two-element list of holes; apply:<n> -> (_func _arg1 ... _argn), a list of n+1 elements (the head plus n argument holes), e.g. apply:2 -> (_func _arg1 _arg2); hole -> _ (a visible placeholder). Forms without a shape, such as match and for/*, are ordinary lists: they parse, copy, move, insert, and delete like any other list, but cannot be constructed from a skeleton.\n" +
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
