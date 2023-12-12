import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/tokenizer";
import {
  RGPUExprParser,
  serialize_nodes,
  simplify_cst,
} from "../src/expr-parser";
import { RGPUStmtParser } from "../src/stmt-parser";

describe("RGPU Statement Parser", () => {
  it("should parse zero-arg attributes", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = [
      "   @const     ",
      "@ invariant",
      "@must_use",
      "@vertex",
      "@fragment",
      "@compute   ",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse multi-arg attributes", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = [
      "@align(1 + a, )",
      " @binding( f32 )",
      " @   id( mat32*2.0 )  ",
      " @  /** test */ location( main_set(4) )  ",
      " @   size( 430, )  ",
      "@interpolate  (32, a)",
      "@interpolate  (4)",
      "@workgroup_size  (1, 1, 8)",
      "@workgroup_size  (1, 1, )",
      "@workgroup_size  (1)",
      "@diagnostic  (error, a.b)",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
