import { ListNode, Node } from "../src/ast.js";
import { parse } from "../src/parser.js";

function firstDivergence(a: Node, b: Node, depth: number): number | null {
  if (a.type === "atom" && b.type === "atom") {
    if (a.tag === b.tag && a.value === b.value) return null;
    return depth;
  }
  if (a.type !== b.type) return depth;
  const left = a as ListNode;
  const right = b as ListNode;
  if (left.items.length !== right.items.length) return depth;
  for (let i = 0; i < left.items.length; i++) {
    const found = firstDivergence(left.items[i], right.items[i], depth + 1);
    if (found !== null) return found;
  }
  return null;
}

export function computeTargetDepth(input: string, expected: string): number {
  try {
    return firstDivergence(parse(input), parse(expected), 0) ?? 0;
  } catch {
    return 0;
  }
}
