import { expect } from "chai";
import { RGPUExprParser, RPGUTokenizer } from "../src";

describe("RGPU Expression Parser", () => {
  it("should parse identifiers", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = ["a(b,(c+d)", "a+b+c"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);
      const cst = parser.parse(tokens);

      console.log(JSON.stringify(cst, null, 4));

      expect(cst).to.deep.equal([]);
    });
  });
});
