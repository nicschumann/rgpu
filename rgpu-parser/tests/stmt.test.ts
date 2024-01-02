import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/cst/tokenizer";
import {
  RGPUExprParser,
  serialize_nodes,
  simplify_cst,
} from "../src/cst/expr-parser";
import { RGPUStmtParser } from "../src/cst/stmt-parser";
import { RGPUAttrParser } from "../src/cst/attr-parser";

describe("RGPU Statement Parser", () => {
  it("should parse single statements", () => {
    const lexer = new RPGUTokenizer();
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const parser = new RGPUStmtParser(expr_parser, attr_parser);
    const testcases = [
      "return a + b;",
      "if (true) { return a + b; }",
      "if a + b { return x; } else if a*2 == 3 {return y;}",
      "if a + b { return x; } else if a*2 == 3 {return y;} else { return 3.0; }",
      "switch x { default: { return a; } }",
      "switch x { case default, x + 1 : { return a; } }",
      "switch x { case 0, x { if (x == 0) {return a} else {return b} } case 3: { return b; } }",
      "@binding(0) switch x @debug { \n case 0 @group(1) { return 1; }}",
      "switch x { case default: { return a; } }",
      "loop @group(0) { return a; continuing { break if i < 4; } }",
      "loop { let a = 10; return a; continuing @group(0) { break if i < 4; } }",
      "var<storage> a = 3.0;",
      "const_assert (x > 0);",
      "a *= 2.0;",
      "a[0].x /= f(32, f(1));",
      "_ *= f(x);", // technically, an error...
      "*a++;",
      "for (var a = 0; a <= x + 1 ; a++) { a = a + 1; b *= f(x); }",
      "for (var a:vec2<i32> = vec2(); ; a.x++) { a.x = a.y + 1; a.y *= f(x); }",
      "while x <= 100 { a = f(a); x += 1; break if x <0 ;}",
      "while x != b { ; }",
    ];

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
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const parser = new RGPUStmtParser(expr_parser, attr_parser);
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
    const expr_parser = new RGPUExprParser();
    const attr_parser = new RGPUAttrParser(expr_parser);
    const parser = new RGPUStmtParser(expr_parser, attr_parser);
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
});
