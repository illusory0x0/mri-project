import { ToolSpec } from "./types.js";

export const TOOL_SPECS: Record<string, ToolSpec> = {
  lisp_editor: {
    name: "lisp_editor",
    description:
      "Edit the current Lisp program by AST path. `args` is the full argument list to the lisp-editor CLI. The current program is fed on stdin and the edited program is returned on success.\n" +
      "Commands:\n" +
      "- [\"outline\"] lists every node as {path, tag, hole}. Call this first to find paths.\n" +
      "- [\"replace\", \"<shape>\", \"--out\", \"<path>\"] replaces the node at <path> with a shape skeleton.\n" +
      "- [\"replace\", \"--in\", \"<srcPath>\", \"--out\", \"<dstPath>\"] copies an existing subtree.\n" +
      "A path is a JSON array of child indices, e.g. [0,2,1]; the root is [].\n" +
      "Shapes: lambda -> (lambda (_param) _body); if -> (if _cond _then _else); define -> (define _name _body); let -> (let ((_name _value)) _body); apply:<n> -> (_func _arg1 ... _argn), e.g. apply:2 -> (_func _arg1 _arg2); hole -> _ (deletes a node).\n" +
      "To build an n-argument form such as (+ x 1), use replace apply:2 then fill _func=var:+, _arg1=var:x, _arg2=num:1. To change an operator in place, replace just the head node, e.g. replace var:- --out <path-of-+>.\n" +
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
