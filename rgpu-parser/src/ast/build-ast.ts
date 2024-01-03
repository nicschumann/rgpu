import { TokenKind } from "../token-defs";
import { CharPosition, Syntax, isSyntaxLeaf, isSyntaxNode } from "../types";

type CharRange = { start: CharPosition | null; end: CharPosition | null };

function range_extents(range: CharRange[], children: Syntax[]): CharRange {
  let start: CharPosition | null = null;
  let end: CharPosition | null = null;

  let i: number = 0;
  let j: number = range.length - 1;
  let k: number;
  // STEP 1: Determine the extends of the range...

  // forward until we hit the first defined range...
  while (i < range.length) {
    if (range[i].start !== null) {
      start = range[i].start;
      break;
    }
    i++;
  }

  // backward until we hit the last defined range...
  while (j >= 0) {
    if (range[j].end != null) {
      end = range[j].end;
      break;
    }
    j--;
  }

  if (start !== null && end !== null) {
    // we have some tokens, so we need to propagate ranges..

    // STEP 2: Fill out any leading or trailing edges
    // console.log(`i ${i}; j ${j}`);
    let i_prime = 0;
    while (i_prime < i) {
      // a node with zero length is correct for errors.
      children[i_prime].start = children[i].start;
      children[i_prime].end = children[i].start;
      i_prime++;
    }

    let j_prime = range.length - 1;
    while (j_prime > j) {
      // a node with zero length is correct for errors.
      children[j_prime].start = children[j].end;
      children[j_prime].end = children[j].end;
      j_prime--;
    }

    // // STEP 3: Fill in any missing internal ranges...
    // // scan the middle to make sure we don't have any undefined interior starts
    // k = i + 1;
    // let last_i = i;
    // while (k < j) {
    //   // j is the last defined index...
    //   if (range[k].start === null) children[k].start = children[last_i].end;
    //   else last_i = k;
    //   k++;
    // }

    // // // scan the middle to make sure we don't have any undefined interior ends
    // k = j - 1;
    // let last_j = j;
    // while (k > i) {
    //   if (range[k].end === null) children[k].end = children[last_j].start;
    //   else last_j = k;
    //   k--;
    // }
  }

  return { start, end };
}

// all nodes must contain some child containing tokens...
export function elaborate_ranges(syntax: Syntax): CharRange {
  if (isSyntaxNode(syntax)) {
    // elaborates all the children...
    let ranges = syntax.children.map(elaborate_ranges);
    let { start, end } = range_extents(ranges, syntax.children);

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
