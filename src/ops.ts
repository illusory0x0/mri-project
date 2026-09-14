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
  "define-fn": LIST([
    SYMBOL("define"),
    LIST([SYMBOL("_name"), SYMBOL("_param")]),
    SYMBOL("_body"),
  ]),
  let: LIST([
    SYMBOL("let"),
    LIST([LIST([SYMBOL("_name"), SYMBOL("_value")])]),
    SYMBOL("_body"),
  ]),
  "let*": LIST([
    SYMBOL("let*"),
    LIST([LIST([SYMBOL("_name"), SYMBOL("_value")])]),
    SYMBOL("_body"),
  ]),
  letrec: LIST([
    SYMBOL("letrec"),
    LIST([LIST([SYMBOL("_name"), SYMBOL("_value")])]),
    SYMBOL("_body"),
  ]),
  "let-loop": LIST([
    SYMBOL("let"),
    SYMBOL("_loop"),
    LIST([LIST([SYMBOL("_name"), SYMBOL("_value")])]),
    SYMBOL("_body"),
  ]),
  cond: LIST([
    SYMBOL("cond"),
    LIST([SYMBOL("_test1"), SYMBOL("_body1")]),
    LIST([SYMBOL("_test2"), SYMBOL("_body2")]),
  ]),
  and: LIST([SYMBOL("and"), SYMBOL("_arg1"), SYMBOL("_arg2")]),
  or: LIST([SYMBOL("or"), SYMBOL("_arg1"), SYMBOL("_arg2")]),
  when: LIST([SYMBOL("when"), SYMBOL("_cond"), SYMBOL("_body")]),
  unless: LIST([SYMBOL("unless"), SYMBOL("_cond"), SYMBOL("_body")]),
  begin: LIST([SYMBOL("begin"), SYMBOL("_body1"), SYMBOL("_body2")]),
  list: LIST([SYMBOL("_item1"), SYMBOL("_item2")]),
  hole: SYMBOL("_"),
};

export function expandShape(spec: string): Node {
  const shape = SHAPES[spec];
  if (shape !== undefined) return clone(shape);

  if (spec.startsWith("apply:")) {
    const raw = spec.slice("apply:".length);
    if (!/^\d+$/.test(raw)) {
      throw new OpsError(`invalid arity: ${JSON.stringify(raw)}`);
    }
    const arity = Number(raw);
    const args = Array.from({ length: arity }, (_, i) =>
      SYMBOL(`_arg${i + 1}`)
    );
    return LIST([SYMBOL("_func"), ...args]);
  }
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

  throw new OpsError(
    `unknown shape: ${spec} (valid shapes: ${Object.keys(SHAPES).join(", ")}, apply:<n>; atoms: var:<name>, num:<n>, str:<s>)`
  );
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

export function deleteAt(root: Node, path: number[]): Node {
  if (path.length === 0) {
    throw new OpsError("cannot delete the root");
  }
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const parent = resolve(root, parentPath);
  if (parent.type !== "list") {
    throw new OpsError(
      `cannot delete path ${JSON.stringify(path)}: its parent is not a list`
    );
  }
  if (index >= parent.items.length) {
    throw new OpsError(`path ${JSON.stringify(path)} is out of range`);
  }
  const items = parent.items.slice();
  items.splice(index, 1);
  return replaceAt(root, parentPath, { type: "list", items });
}

export function insertAt(
  root: Node,
  path: number[],
  index: number,
  next: Node
): Node {
  const target = resolve(root, path);
  if (target.type !== "list") {
    throw new OpsError(
      `cannot insert into path ${JSON.stringify(path)}: it is not a list`
    );
  }
  if (!Number.isInteger(index) || index < 0 || index > target.items.length) {
    throw new OpsError(
      `index ${index} is out of range for path ${JSON.stringify(path)}`
    );
  }
  const items = target.items.slice();
  items.splice(index, 0, next);
  return replaceAt(root, path, { type: "list", items });
}

export type OutlineKind =
  | "define" | "lambda" | "let" | "let*" | "if" | "cond" | "quote"
  | "apply"
  | "list"
  | "symbol" | "number" | "string" | "boolean" | "character" | "hole";

export interface OutlineEntry {
  path: number[];
  kind: OutlineKind;
  head?: string;
  value?: string;
}

const FORM_KEYWORDS = new Set(["define", "lambda", "let", "let*", "if", "cond", "quote"]);

function classify(node: Node): Omit<OutlineEntry, "path"> {
  if (node.type === "atom") {
    if (isHole(node)) return { kind: "hole", value: node.value };
    return { kind: node.tag, value: node.value };
  }
  const head = node.items[0];
  if (
    head !== undefined &&
    head.type === "atom" &&
    head.tag === "symbol" &&
    !isHole(head)
  ) {
    if (FORM_KEYWORDS.has(head.value)) {
      return { kind: head.value as OutlineKind };
    }
    return { kind: "apply", head: head.value };
  }
  return { kind: "list" };
}

export function outline(root: Node): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const walk = (node: Node, path: number[]): void => {
    entries.push({ path, ...classify(node) });
    if (node.type === "list") {
      node.items.forEach((child, index) => walk(child, path.concat(index)));
    }
  };
  walk(root, []);
  return entries;
}
