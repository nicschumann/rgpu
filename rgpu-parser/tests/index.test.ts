import { expect } from "chai";
import { RPGUTokenizer } from "../src";
import { TokenKind } from "../src/tokens";

describe("RGPU Lexer", () => {
  it("should tokenize decimal int literals", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["1200u", "123", "0", "0u"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize(testcase);
      expect(r).to.deep.equal([
        { kind: TokenKind.DEC_INT_LITERAL, text: testcase },
      ]);
    });
  });

  it("should tokenize decimal float literals", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["0.e+4f", "01.", ".01", "12.34", ".0f", "0h", "1e-3"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize(testcase);
      expect(r).to.deep.equal([
        { kind: TokenKind.DEC_FLOAT_LITERAL, text: testcase },
      ]);
    });
  });
});
