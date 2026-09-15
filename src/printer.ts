import { AtomNode, Node } from "./ast.js";

const WIDTH = 80;

function escapeString(value: string): string {
  let out = "";
  for (const ch of value) {
    switch (ch) {
      case "\\":
        out += "\\\\";
        break;
      case '"':
        out += '\\"';
        break;
      case "\n":
        out += "\\n";
        break;
      case "\t":
        out += "\\t";
        break;
      case "\r":
        out += "\\r";
        break;
      default:
        out += ch;
    }
  }
  return out;
}

function printAtom(node: AtomNode): string {
  if (node.tag === "string") return `"${escapeString(node.value)}"`;
  return node.value;
}

export function printFlat(node: Node): string {
  if (node.type === "atom") return printAtom(node);
  return "(" + node.items.map(printFlat).join(" ") + ")";
}

export function printNode(node: Node, indent = 0): string {
  if (node.type === "atom") return printAtom(node);

  const flat = printFlat(node);
  if (node.items.length === 0 || indent + flat.length <= WIDTH) {
    return flat;
  }

  const head = node.items[0];
  const rest = node.items.slice(1);
  if (head !== undefined && rest.length > 0) {
    const headStr = printFlat(head);
    const firstStr = printNode(rest[0], indent + headStr.length + 2);
    const pad = " ".repeat(indent + 2);
    const restStr = rest
      .slice(1)
      .map((item) => pad + printNode(item, indent + 2));
    const tail = restStr.length > 0 ? "\n" + restStr.join("\n") : "";
    return (
      "(" +
      headStr +
      " " +
      firstStr +
      tail +
      "\n" +
      " ".repeat(indent) +
      ")"
    );
  }

  const pad = " ".repeat(indent + 2);
  return (
    "(\n" +
    node.items.map((item) => pad + printNode(item, indent + 2)).join("\n") +
    "\n" +
    " ".repeat(indent) +
    ")"
  );
}

export function printProgram(root: Node): string {
  if (root.type === "list") {
    return root.items.map((item) => printNode(item)).join("\n");
  }
  return printNode(root);
}
