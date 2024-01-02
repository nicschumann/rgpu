import { TokenKind } from "../token-defs";
import { CharPosition, Syntax, isSyntaxLeaf, isSyntaxNode } from "../types";

type CharRange = { start: CharPosition | null; end: CharPosition | null };

function range_extents(range: CharRange[]): CharRange {
  let start: CharPosition | null = null;
  let end: CharPosition | null = null;
  let i: number;

  i = 0;
  while (i < range.length) {
    if (range[i].start !== null) {
      start = range[i].start;
      break;
    }
    i++;
  }

  i = range.length - 1;
  while (i >= 0) {
    if (range[i].end != null) {
      end = range[i].end;
      break;
    }
    i--;
  }

  return { start, end };
}

// all nodes must contain some child containing tokens...
export function elaborate_ranges(syntax: Syntax): CharRange {
  if (isSyntaxNode(syntax)) {
    // elaborates all the children...
    let range = syntax.children.map((child) => elaborate_ranges(child));

    let { start, end } = range_extents(range);

    if (syntax.leading_trivia.length > 0) {
      start = syntax.leading_trivia[0].start;
    } else if (start === null && syntax.trailing_trivia.length > 0) {
      start = syntax.trailing_trivia[0].start;
    }

    if (syntax.trailing_trivia.length > 0) {
      end = syntax.trailing_trivia[syntax.trailing_trivia.length - 1].end;
    } else if (end === null && syntax.leading_trivia.length > 0) {
      end = syntax.leading_trivia[syntax.leading_trivia.length - 1].end;
    }

    if (start !== null) syntax.start = start;
    if (end !== null) syntax.end = end;

    return {
      start,
      end,
    };
  } else if (isSyntaxLeaf(syntax)) {
    let start: CharPosition | null = null;
    let end: CharPosition | null = null;

    if (syntax.leading_trivia.length) {
      start = syntax.leading_trivia[0].start;
    } else if (typeof syntax.start !== "undefined") {
      start = syntax.start;
    }

    if (syntax.trailing_trivia.length) {
      end = syntax.trailing_trivia[syntax.trailing_trivia.length - 1].end;
    } else if (typeof syntax.end !== "undefined") {
      end = syntax.end;
    }

    if (start !== null) syntax.start = start;
    if (end !== null) syntax.end = end;

    return { start, end };
  }

  // got some kind of weird node that doesn't make sense...
  console.error("Bad Input: received something that's not a Syntax item.");
  return { start: null, end: null };
}

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
