import { expect } from "chai";
import { RPGUTokenizer } from "../src/tokenizer";
import { RGPUExprParser, serialize_nodes, simplify_cst } from "../src/parser";

describe("RGPU Expression Parser", () => {
  it("should parse arithmetic expressions", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      " a + 1.0     /** weird constant */  / 1e-3  // and another comment",
      " a * b / c",
      " (a + b) * 0f  // this is a line comment \n",
      "(a + b) * (c - d)",
      "(a + b * (c - d)",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse function calls", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "a()",
      "a(b, c + d, )",
      "   f(a+b , c*d/ ident) /** comment **/",
      "func(   main(), other(a-c, 0.000232 )   )",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
