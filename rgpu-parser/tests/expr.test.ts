import { expect } from "chai";
import { RPGUTokenizer } from "../src/tokenizer";
import {
  RGPUExprParser2 as RGPUExprParser,
  serialize_nodes,
} from "../src/parser";

describe("RGPU Expression Parser", () => {
  it("should parse identifiers", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      " a + b     /** this is a big comment test */  / c  // and another comment",
      " a * b / c",
      " (a + b) * c  // this is a line comment \n",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      console.log(JSON.stringify(cst, null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
