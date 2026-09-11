import { ToolSpec } from "./types.js";

export const TOOL_SPECS: Record<string, ToolSpec> = {
  lisp_editor: {
    name: "lisp_editor",
    description:
      "Edit the current Lisp program by AST path. `args` is the full argument list to the lisp-editor CLI, for example [\"outline\"] to inspect the tree, [\"replace\",\"lambda\",\"--out\",\"[0]\"] to replace a node with a shape, or [\"replace\",\"--in\",\"[0,1]\",\"--out\",\"[0,2]\"] to copy a subtree. The current program is fed on stdin and the edited program is returned.",
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
