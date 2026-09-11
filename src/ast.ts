export type AtomTag = "symbol" | "number" | "string";

export interface AtomNode {
  type: "atom";
  tag: AtomTag;
  value: string;
}

export interface ListNode {
  type: "list";
  items: Node[];
}

export type Node = AtomNode | ListNode;

export const NUMBER_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

export function isNumberLiteral(text: string): boolean {
  return NUMBER_RE.test(text);
}

const SYMBOL_DELIMITERS = new Set([
  "(",
  ")",
  '"',
  ";",
  "'",
  "`",
  ",",
  " ",
  "\t",
  "\n",
  "\r",
]);

export function isValidSymbol(text: string): boolean {
  if (text.length === 0 || isNumberLiteral(text)) return false;
  for (const ch of text) {
    if (SYMBOL_DELIMITERS.has(ch)) return false;
  }
  return true;
}

export function isHole(node: Node): boolean {
  return node.type === "atom" && node.tag === "symbol" && node.value.startsWith("_");
}

export function clone(node: Node): Node {
  if (node.type === "atom") {
    return { type: "atom", tag: node.tag, value: node.value };
  }
  return { type: "list", items: node.items.map(clone) };
}
