import { TokenKind } from "../token-defs";
import { CharRange, Syntax } from "../types";

export function compute_range(syntax: Syntax) {}

/**
 * Given a concrete syntax tree, annotate the tree into an abstract syntax tree
 * that can be traversed.
 *
 * @param syntax a concrete syntax tree
 */
export function compute_ast(syntax: Syntax) {
  switch (syntax.kind) {
    case TokenKind.AST_TRANSLATION_UNIT:
      break;
  }
}
