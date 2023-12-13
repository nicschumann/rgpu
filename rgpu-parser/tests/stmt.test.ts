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

      parser.reset(tokens);
      const cst = parser.compound_stmt();
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

      parser.reset(tokens);
      const cst = parser.attribute();
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse single statements", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = ["return a + b;"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.single_stmt();
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse compound statements", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = ["@const { return a + b; }"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.compound_stmt();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse variable declarations", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = [
      "  var<attr>    ident ",
      "var x: f32 ",
      "var hello: vec2<f32>",
      "var<storage, read> hello: v<i32> = f(x)  ",
      "const x: i32 = (1 + 2) * 3 ",
      // "const x: i32 = ;",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.var_stmt();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse global variable and value declarations", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUStmtParser(new RGPUExprParser());
    const testcases = [
      "@group(0) @binding(1) var<uniform, read> a = 1",
      "@workgroup_(0,1,2) var<uniform, read> a : array<f32, 2> = a + b",
      "@work(0,1 @binding(0) var<uniform, read> a : array<f32, 2> = a + b",
      "@group(0) @binding(1) var<uniform, read> = ", // error
      "const a: i32 = f(1)",
      "override a: vec2<bool>",
      "@binding(0) override a: vec2<bool>",
      "@binding(1)override input: vec2<bool> = vec2(true, true)",
      "const test: i32", // error
      "@workgroup_size const test: i32", // big error
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.global_var_decl();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
