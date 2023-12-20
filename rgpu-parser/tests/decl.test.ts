import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/tokenizer";
import {
  RGPUExprParser,
  serialize_nodes,
  simplify_cst,
} from "../src/expr-parser";
import { RGPUAttrParser } from "../src/attr-parser";
import { RGPUDeclParser } from "../src/decl-parser";
import { RGPUStmtParser } from "../src/stmt-parser";

describe("RGPU Declaration Parser", () => {
  it("should parse global variable and value declarations", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const stmt_parser = new RGPUStmtParser(expr_parser, attr_parser);
    const parser = new RGPUDeclParser(expr_parser, attr_parser, stmt_parser);

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
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse alias declarations", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const stmt_parser = new RGPUStmtParser(expr_parser, attr_parser);
    const parser = new RGPUDeclParser(expr_parser, attr_parser, stmt_parser);
    const testcases = [
      "alias a = int",
      "alias a = array<vec2, 3>",
      "alias a", // error case
      "alias =", // error case
      "alias Rec = i32",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.type_alias_decl();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse struct declarations", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const stmt_parser = new RGPUStmtParser(expr_parser, attr_parser);
    const parser = new RGPUDeclParser(expr_parser, attr_parser, stmt_parser);
    const testcases = [
      "struct test {}",
      "struct test {,}", // error case
      "struct Test { test", // error case...
      "struct Test { @binding(0) test: vec2<i32> }    ",
      "struct Test { @binding(0) @group(1) test: vec2<i32>, integer: i32, }    ",
      "struct Data { a : i32, b : vec2<f32>, c : array<i32, 10>}",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.struct_decl();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse const assert statements", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const stmt_parser = new RGPUStmtParser(expr_parser, attr_parser);
    const parser = new RGPUDeclParser(expr_parser, attr_parser, stmt_parser);
    const testcases = ["const_assert a < 23 + b"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.const_assert();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse function declarations", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const stmt_parser = new RGPUStmtParser(expr_parser, attr_parser);
    const parser = new RGPUDeclParser(expr_parser, attr_parser, stmt_parser);
    const testcases = [
      "fn main(@builtin(vertex_position) x: vec2<i32>) { return 0; }",
      "fn main(@builtin(vertex_position) v: vec2<i32>, y: i32 ) -> @builtin(vertex_position) vec4<f32> { return v.x + y; }",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.global_function_decl();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse global declarations", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();
    const testcases = [
      "fn main(@builtin(vertex_position) x: vec2<i32>) { return 0; }",
      "fn main(@builtin(vertex_position) v: vec2<i32>, y: i32 ) -> @builtin(vertex_position) vec4<f32> { return v.x + y; }",
      "@grp struct Uniforms { light_dir: vec3<i32>, light_pos: vec3<i32> }",
      "const_assert x <= 100;",
      "alias v2i = vec2<i32>;",
      "var<storage> a : i32;",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.global_decl();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
