import {
  AtomNode,
  clone,
  isHole,
  isNumberLiteral,
  isValidSymbol,
  ListNode,
  Node,
} from "./ast.js";

export class OpsError extends Error {}

const SYMBOL = (value: string): AtomNode => ({
  type: "atom",
  tag: "symbol",
  value,
});

const LIST = (items: Node[]): ListNode => ({ type: "list", items });

const SHAPES: Record<string, Node> = {
  lambda: LIST([SYMBOL("lambda"), LIST([SYMBOL("_param")]), SYMBOL("_body")]),
  if: LIST([SYMBOL("if"), SYMBOL("_cond"), SYMBOL("_then"), SYMBOL("_else")]),
  define: LIST([SYMBOL("define"), SYMBOL("_name"), SYMBOL("_body")]),
  let: LIST([
    SYMBOL("let"),
    LIST([LIST([SYMBOL("_name"), SYMBOL("_value")])]),
    SYMBOL("_body"),
  ]),
  apply: LIST([SYMBOL("_func"), SYMBOL("_args")]),
  hole: SYMBOL("_"),
};

export function expandShape(spec: string): Node {
  const shape = SHAPES[spec];
  if (shape !== undefined) return clone(shape);

  if (spec.startsWith("var:")) {
    const name = spec.slice("var:".length);
    if (!isValidSymbol(name)) {
      throw new OpsError(`invalid variable name: ${JSON.stringify(name)}`);
    }
    return SYMBOL(name);
  }
  if (spec.startsWith("num:")) {
    const value = spec.slice("num:".length);
    if (!isNumberLiteral(value)) {
      throw new OpsError(`invalid number: ${JSON.stringify(value)}`);
    }
    return { type: "atom", tag: "number", value };
  }
  if (spec.startsWith("str:")) {
    return { type: "atom", tag: "string", value: spec.slice("str:".length) };
  }

  throw new OpsError(`unknown shape: ${spec}`);
}

export function parsePath(raw: string): number[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new OpsError(`invalid path: ${raw}`);
  }
  if (
    !Array.isArray(value) ||
    value.some((n) => !Number.isInteger(n) || (n as number) < 0)
  ) {
    throw new OpsError(`invalid path: ${raw}`);
  }
  return value as number[];
}

export function resolve(root: Node, path: number[]): Node {
  let current = root;
  for (let depth = 0; depth < path.length; depth++) {
    const index = path[depth];
    if (current.type !== "list") {
      throw new OpsError(
        `path ${JSON.stringify(path)} traverses a non-list at depth ${depth}`
      );
    }
    if (index >= current.items.length) {
      throw new OpsError(
        `path ${JSON.stringify(path)} is out of range at depth ${depth}`
      );
    }
    current = current.items[index];
  }
  return current;
}

export function replaceAt(root: Node, path: number[], next: Node): Node {
  if (path.length === 0) return next;
  const [index, ...rest] = path;
  if (root.type !== "list") {
    throw new OpsError(`path ${JSON.stringify(path)} traverses a non-list node`);
  }
  if (index >= root.items.length) {
    throw new OpsError(`path ${JSON.stringify(path)} is out of range`);
  }
  const items = root.items.slice();
  items[index] = replaceAt(items[index], rest, next);
  return { type: "list", items };
}

export interface OutlineEntry {
  path: number[];
  tag: string;
  hole: boolean;
}

function tagOf(node: Node): string {
  if (node.type === "atom") return node.tag;
  const head = node.items[0];
  if (head !== undefined && head.type === "atom" && head.tag === "symbol") {
    return head.value;
  }
  return "list";
}

export function outline(root: Node): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const walk = (node: Node, path: number[]): void => {
    entries.push({ path, tag: tagOf(node), hole: isHole(node) });
    if (node.type === "list") {
      node.items.forEach((child, index) => walk(child, path.concat(index)));
    }
  };
  walk(root, []);
  return entries;
}
