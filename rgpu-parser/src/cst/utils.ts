import { ErrorKind } from "../token-defs";
import {
  SimplifiedSyntax,
  Syntax,
  Token,
  isSyntaxLeaf,
  isSyntaxNode,
} from "../types";

export function serialize_nodes(syntax: Syntax | null): string {
  if (syntax == null) {
    return "<null>";
  }

  const pre = syntax.leading_trivia.map((v) => v.text).join("");
  const post = syntax.trailing_trivia.map((v) => v.text).join("");

  if (isSyntaxLeaf(syntax)) {
    return `${pre}${syntax.text}${post}`;
  } else if (isSyntaxNode(syntax)) {
    const child_text = syntax.children.map(serialize_nodes).join("");
    return `${pre}${child_text}${post}`;
  }

  return "";
}

export function simplify_cst(syntax: Syntax): SimplifiedSyntax {
  const pre = syntax.leading_trivia.map((v) => v.text).join("");
  const post = syntax.trailing_trivia.map((v) => v.text).join("");
  const is_error = syntax.error !== ErrorKind.ERR_NO_ERROR;

  if (isSyntaxLeaf(syntax)) {
    const node: SimplifiedSyntax = {
      text: `${pre}${syntax.text}${post}`,
    };

    if (
      typeof syntax.start !== "undefined" &&
      typeof syntax.start !== "undefined"
    ) {
      node.range = `(${syntax.start.row},${syntax.start.col})-(${syntax.end.row},${syntax.end.col})`;
    }

    if (is_error) node.error = true;

    return node;
  } else {
    const node: SimplifiedSyntax = {
      children: syntax.children.map(simplify_cst),
    };

    if (syntax.leading_trivia.length > 0) node.pre = pre;
    if (syntax.trailing_trivia.length > 0) node.post = post;

    if (
      typeof syntax.start !== "undefined" &&
      typeof syntax.start !== "undefined"
    ) {
      node.range = `(${syntax.start.row},${syntax.start.col})-(${syntax.end.row},${syntax.end.col})`;
    }

    if (is_error) node.error = true;

    return node;
  }
}

export function serialize_tokens(tokens: Token[]): string {
  return tokens.map((t) => t.text).join("");
}
