import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/cst/tokenizer";
import { serialize_nodes, simplify_cst } from "../src/cst/expr-parser";
import { RGPUDeclParser } from "../src/cst/decl-parser";
import { elaborate_ranges } from "../src/ast/build-ast";
import { Syntax, isSyntaxLeaf, isSyntaxNode } from "../src/types";
import { ErrorKind } from "../src/token-defs";

const check_range_structure = (syntax: Syntax): boolean => {
  if (isSyntaxNode(syntax)) {
    const valid_node_ranges =
      (typeof syntax.start === "undefined" &&
        typeof syntax.end === "undefined") ||
      (typeof syntax.start !== "undefined" &&
        typeof syntax.end !== "undefined");

    const children_valid = syntax.children.reduce(
      (a, b) => a && check_range_structure(b),
      true
    );

    return valid_node_ranges && children_valid;
  } else if (isSyntaxLeaf(syntax)) {
    return (
      (typeof syntax.start === "undefined" &&
        typeof syntax.end === "undefined") ||
      (typeof syntax.start !== "undefined" && typeof syntax.end !== "undefined")
    );
  }

  // error case
  return false;
};

const check_cst_ranges_match_source = (
  syntax: Syntax,
  source_code: string,
  source_lines: string[]
): boolean => {
  if (
    typeof syntax.start !== "undefined" &&
    typeof syntax.end !== "undefined"
  ) {
    const { row: sr, col: sc, offset: so } = syntax.start;
    const { row: er, col: ec, offset: eo } = syntax.end;
    let children_valid = true;

    // We can probably actually delete this check...
    let rc_text = "";
    let row = sr;
    let start_col = sc;
    while (row <= er) {
      if (row < er) {
        rc_text += source_lines[row].slice(start_col);
      } else {
        rc_text += source_lines[row].slice(start_col, ec);
      }

      row += 1;
      start_col = 0;
    }

    const o_text = source_code.slice(so, eo);
    const node_contents = serialize_nodes(syntax);

    // console.log(`"${node_contents}" =?= "${o_text}"`);

    expect(node_contents).to.equal(rc_text); // the token should equal the text at this row/column exactly
    expect(node_contents).to.equal(o_text); // the token should equal the text at this offset exactly

    if (isSyntaxNode(syntax)) {
      children_valid = syntax.children.reduce(
        (a, b) =>
          a && check_cst_ranges_match_source(b, source_code, source_lines),
        true
      );
    }

    return (
      node_contents === rc_text && node_contents === o_text && children_valid
    );
  } else if (
    typeof syntax.start === "undefined" &&
    typeof syntax.end === "undefined"
  ) {
    // console.log("both undefined!", console.log(syntax));

    if (isSyntaxNode(syntax)) {
      /** NOTE(Nic): We've hit a node with no start or end annotations;
       * only error nodes should be lower in the tree, below this.
       * to ensure this in testing, we'll truncate the source code to the empty string,
       * which will cause our assertions to fail if we try and look up any tokens.
       */
      return syntax.children.reduce(
        (a, b) => a && check_cst_ranges_match_source(b, "", [""]),
        true
      );
    } else {
      // error node, probably...
      return syntax.error !== ErrorKind.ERR_NO_ERROR;
    }
  } else {
    // this is case that should never happen.
    // we have a structural check before runnning this that checks for this.
    console.log("structural error!");
    return false;
  }
};

describe("RGPU Range Elaboration", () => {
  it("should correctly annotate lines and columns", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();

    const testcases = [
      "var a = 10; var b = 1000f;",
      "@work(0,1 @binding(0) var<uniform, read> a : array<f32, 2> = a + b",
      "a = 1; fn main( { a; var a : i32 = 10;",
      " a = 1; fn main",
      "var<storage> a: i32; for (let a = (a + b); a <; a += ) { let a = 1",
      " a + 2",
    ];

    testcases.forEach((testcase) => {
      const testcase_lines = testcase
        .split("\n")
        .map((line, i, a) => (i < a.length - 1 ? `${line}\n` : line));

      const tokens = lexer.tokenize_source(testcase);

      parser.reset(tokens);
      const cst = parser.translation_unit();

      elaborate_ranges(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      const valid_structure = check_range_structure(cst);
      const valid_ranges = check_cst_ranges_match_source(
        cst,
        testcase,
        testcase_lines
      );

      // NOTE(Nic): add a testcase to check that the reported range
      // covers the entire program text.

      expect(valid_structure).to.be.true;
      expect(valid_ranges).to.be.true;
    });
  });
});
