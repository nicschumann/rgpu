import { expect } from "chai";
import { RGPUExprParser, RPGUTokenizer } from "../src";

const INDENT = "  ";

const print_cst = (cst, tablevel: string = "") => {
  if (typeof cst.children !== "undefined") {
    const subtree = cst.children
      .map((n) => {
        return `${INDENT}${print_cst(n, tablevel + INDENT)}`;
      })
      .join("\n");

    return `${tablevel}${cst.kind}\n${subtree}`;
  } else {
    return `(${cst.text})`;
  }
};

describe("RGPU Expression Parser", () => {
  it("should parse identifiers", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = ["a*b/c"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);
      const cst = parser.parse(tokens);

      console.log(JSON.stringify(cst, null, 4));

      // console.log(print_cst(cst, ""));

      expect(cst).to.deep.equal([]);
    });
  });
});
