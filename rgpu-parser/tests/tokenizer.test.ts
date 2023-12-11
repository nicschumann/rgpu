import { expect } from "chai";
import { RPGUTokenizer } from "../src/tokenizer";
import { TokenKind } from "../src/tokens";
import { normalize } from "./lib";

describe("RGPU Tokenizer", () => {
  it("should tokenize decimal int literals", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["1200u", "123", "0", "0u"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);

      expect(r).to.deep.equal([
        { kind: TokenKind.DEC_INT_LITERAL, text: testcase },
      ]);
    });
  });

  it("should tokenize decimal float literals", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["0.e+4f", "01.", ".01", "12.34", ".0f", "0h", "1e-3"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.DEC_FLOAT_LITERAL, text: testcase },
      ]);
    });
  });

  it("should tokenize line comments and whitespace", () => {
    const lexer = new RPGUTokenizer();
    const line_testcases = ["// this is a comment"];

    line_testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.LINE_COMMENT, text: testcase },
      ]);
    });

    const block_testcases = ["/*** this a block comment * */"];

    block_testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.BLOCK_COMMENT, text: testcase },
      ]);
    });

    const line_with_break_and_whitespace = "   //a comment\n   ";

    const r = lexer
      .tokenize_source(line_with_break_and_whitespace)
      .map(normalize);
    expect(r).to.deep.equal([
      { kind: TokenKind.BLANKSPACE, text: "   " },
      { kind: TokenKind.LINE_COMMENT, text: "//a comment" },
      { kind: TokenKind.LINEBREAK, text: "\n" },
      { kind: TokenKind.BLANKSPACE, text: "   " },
    ]);
  });

  it("should tokenize identifiers", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["_identifier", "a123"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.SYM_IDENTIFIER, text: testcase },
      ]);
    });
  });

  it("should tokenize assignment", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["var a123 = 100;"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.KEYWORD_VAR, text: "var" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.SYM_IDENTIFIER, text: "a123" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.SYM_EQUAL, text: "=" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.DEC_INT_LITERAL, text: "100" },
      ]);
    });
  });

  it("should tokenize template lists", () => {
    const lexer = new RPGUTokenizer();

    const r1 = lexer.tokenize_source("a<a,b<f32>,>").map(normalize);
    expect(r1).to.deep.equal([
      { kind: TokenKind.SYM_IDENTIFIER, text: "a" },
      { kind: TokenKind.SYM_TEMPLATE_LIST_START, text: "<" },
      { kind: TokenKind.SYM_IDENTIFIER, text: "a" },
      { kind: TokenKind.SYM_COMMA, text: "," },
      { kind: TokenKind.SYM_IDENTIFIER, text: "b" },
      { kind: TokenKind.SYM_TEMPLATE_LIST_START, text: "<" },
      { kind: TokenKind.SYM_IDENTIFIER, text: "f32" },
      { kind: TokenKind.SYM_TEMPLATE_LIST_END, text: ">" },
      { kind: TokenKind.SYM_COMMA, text: "," },
      { kind: TokenKind.SYM_TEMPLATE_LIST_END, text: ">" },
    ]);

    const r2 = lexer.tokenize_source("a<b || c>d").map(normalize);
    expect(r2).to.deep.equal([
      { kind: TokenKind.SYM_IDENTIFIER, text: "a" },
      { kind: TokenKind.SYM_LESS, text: "<" },
      { kind: TokenKind.SYM_IDENTIFIER, text: "b" },
      { kind: TokenKind.BLANKSPACE, text: " " },
      { kind: TokenKind.SYM_BAR_BAR, text: "||" },
      { kind: TokenKind.BLANKSPACE, text: " " },
      { kind: TokenKind.SYM_IDENTIFIER, text: "c" },
      { kind: TokenKind.SYM_GREATER, text: ">" },
      { kind: TokenKind.SYM_IDENTIFIER, text: "d" },
    ]);
  });
});
