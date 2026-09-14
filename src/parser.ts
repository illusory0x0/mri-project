import { AtomTag, isNumberLiteral, ListNode, Node } from "./ast.js";

export class ParseError extends Error {}

interface Token {
  type: "lparen" | "rparen" | "quote" | "atom";
  tag?: AtomTag;
  value?: string;
  line: number;
  col: number;
}

function isDelimiter(ch: string): boolean {
  return (
    ch === "(" ||
    ch === ")" ||
    ch === '"' ||
    ch === ";" ||
    ch === " " ||
    ch === "\t" ||
    ch === "\n" ||
    ch === "\r"
  );
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = source.length;

  function advance(): string {
    const ch = source[i++];
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  while (i < n) {
    const ch = source[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      advance();
      continue;
    }

    if (ch === ";") {
      while (i < n && source[i] !== "\n") advance();
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", line, col });
      advance();
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen", line, col });
      advance();
      continue;
    }

    if (ch === "'") {
      tokens.push({ type: "quote", line, col });
      advance();
      continue;
    }

    if (ch === "`" || ch === ",") {
      throw new ParseError(
        `backquote/unquote is not supported at ${line}:${col}`
      );
    }

    if (ch === '"') {
      const startLine = line;
      const startCol = col;
      advance();
      let value = "";
      for (;;) {
        if (i >= n) {
          throw new ParseError(
            `unterminated string starting at ${startLine}:${startCol}`
          );
        }
        const c = source[i];
        if (c === '"') {
          advance();
          break;
        }
        if (c === "\\") {
          advance();
          if (i >= n) {
            throw new ParseError(
              `unterminated string escape at ${line}:${col}`
            );
          }
          const escaped = advance();
          switch (escaped) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "\t";
              break;
            case "r":
              value += "\r";
              break;
            case '"':
              value += '"';
              break;
            case "\\":
              value += "\\";
              break;
            default:
              throw new ParseError(
                `unsupported string escape \\${escaped} at ${line}:${col}`
              );
          }
        } else {
          value += advance();
        }
      }
      tokens.push({
        type: "atom",
        tag: "string",
        value,
        line: startLine,
        col: startCol,
      });
      continue;
    }

    if (ch === "#" && source[i + 1] === "\\") {
      const startLine = line;
      const startCol = col;
      advance();
      advance();
      if (i >= n) {
        throw new ParseError(
          `unterminated character literal at ${startLine}:${startCol}`
        );
      }
      let text = "#\\" + advance();
      if (/[A-Za-z]/.test(text[2])) {
        while (i < n && /[A-Za-z]/.test(source[i])) {
          text += advance();
        }
      }
      tokens.push({
        type: "atom",
        tag: "character",
        value: text,
        line: startLine,
        col: startCol,
      });
      continue;
    }

    const startLine = line;
    const startCol = col;
    let text = "";
    while (i < n && !isDelimiter(source[i])) {
      text += advance();
    }
    if (text.length === 0) {
      throw new ParseError(
        `unexpected character ${JSON.stringify(source[i])} at ${line}:${col}`
      );
    }
    const tag: AtomTag =
      text === "#t" || text === "#f" || text === "#true" || text === "#false"
        ? "boolean"
        : isNumberLiteral(text)
        ? "number"
        : "symbol";
    tokens.push({ type: "atom", tag, value: text, line: startLine, col: startCol });
  }

  return tokens;
}

export function parse(source: string): ListNode {
  const tokens = tokenize(source);
  let pos = 0;

  function parseNode(): Node {
    const tok = tokens[pos];
    if (!tok) {
      throw new ParseError("unexpected end of input");
    }
    if (tok.type === "quote") {
      pos++;
      const inner = parseNode();
      return {
        type: "list",
        items: [{ type: "atom", tag: "symbol", value: "quote" }, inner],
      };
    }
    if (tok.type === "lparen") {
      pos++;
      const items: Node[] = [];
      for (;;) {
        const next = tokens[pos];
        if (!next) {
          throw new ParseError(`unclosed '(' opened at ${tok.line}:${tok.col}`);
        }
        if (next.type === "rparen") {
          pos++;
          break;
        }
        items.push(parseNode());
      }
      return { type: "list", items };
    }
    if (tok.type === "rparen") {
      throw new ParseError(`unexpected ')' at ${tok.line}:${tok.col}`);
    }
    pos++;
    return { type: "atom", tag: tok.tag!, value: tok.value! };
  }

  const forms: Node[] = [];
  while (pos < tokens.length) {
    forms.push(parseNode());
  }
  return { type: "list", items: forms };
}
