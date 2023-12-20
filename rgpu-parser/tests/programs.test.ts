import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/tokenizer";
import {
  RGPUExprParser,
  serialize_nodes,
  simplify_cst,
} from "../src/expr-parser";
import { RGPUDeclParser } from "../src/decl-parser";

describe("RGPU Translation Unit Parser", () => {
  it("should parse programs", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();
    const testcases = [
      "fn main(@builtin(vertex_position) x: vec2<i32>) { return 0; }",
      "fn main(@builtin(vertex_position) v: vec2<i32>, y: i32 ) -> @builtin(vertex_position) vec4<f32> { return v.x + y; }",
      "@grp struct Uniforms { light_dir: vec3<i32>, light_pos: vec3<i32> }",
      "const_assert x <= 100;",
      "alias v2i = vec2<i32>;",
      "var<storage> a : i32;",
      "var<storage, read> a:i32; var<storage> b: vec2<i32>;     const_assert a == 0;",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.translation_unit();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
