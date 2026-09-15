export type ToolCall =
  | { kind: "lisp_editor"; args: string[] }
  | { kind: "shell"; command: string }
  | { kind: "invalid"; name: string | undefined; reason: string; raw: unknown };

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      value = parsed;
    } catch {
      return null;
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function decodeToolCall(
  name: string | undefined,
  value: unknown
): ToolCall {
  const obj = asObject(value);
  if (obj !== null) {
    if (name === "lisp_editor") {
      const args = obj.args;
      if (Array.isArray(args) && args.every((a) => typeof a === "string")) {
        return { kind: "lisp_editor", args: args as string[] };
      }
      return { kind: "invalid", name, reason: "args must be strings", raw: value };
    }
    if (name === "shell") {
      const command = obj.command;
      if (typeof command === "string") {
        return { kind: "shell", command };
      }
      return {
        kind: "invalid",
        name,
        reason: "command must be a string",
        raw: value,
      };
    }
  }
  return {
    kind: "invalid",
    name,
    reason: `unknown tool: ${name}`,
    raw: value,
  };
}

export function describeToolCall(call: ToolCall): string {
  switch (call.kind) {
    case "lisp_editor":
      return "lisp-editor " + call.args.join(" ");
    case "shell":
      return call.command;
    case "invalid": {
      const raw = call.raw;
      if (typeof raw === "string") return raw;
      if (raw == null) return "";
      return String(raw);
    }
  }
}
