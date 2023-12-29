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

  it("should tokenize var attributes", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["var<storage, read>"];

    testcases.forEach((testcase) => {
      const r = lexer.tokenize_source(testcase).map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.KEYWORD_VAR, text: "var" },
        { kind: TokenKind.SYM_TEMPLATE_LIST_START, text: "<" },
        { kind: TokenKind.SYM_IDENTIFIER, text: "storage" },
        { kind: TokenKind.SYM_COMMA, text: "," },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.SYM_IDENTIFIER, text: "read" },
        { kind: TokenKind.SYM_TEMPLATE_LIST_END, text: ">" },
      ]);
    });
  });

  it("should tokenize assignment", () => {
    const lexer = new RPGUTokenizer();
    const testcases = ["var a123 = 100;"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);
      const r = tokens.map(normalize);
      expect(r).to.deep.equal([
        { kind: TokenKind.KEYWORD_VAR, text: "var" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.SYM_IDENTIFIER, text: "a123" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.SYM_EQUAL, text: "=" },
        { kind: TokenKind.BLANKSPACE, text: " " },
        { kind: TokenKind.DEC_INT_LITERAL, text: "100" },
        { kind: TokenKind.SYM_SEMICOLON, text: ";" },
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

  it("should preserve token positions", () => {
    const lexer = new RPGUTokenizer();

    ["var a = 100;\nvar b = 200", "a<i32, b<f, 2>> \n a<i32, b<f, 2>>"].forEach(
      (testcase) => {
        const testcase_lines = testcase
          .split("\n")
          .map((line, i, a) => (i < a.length - 1 ? `${line}\n` : line));

        const tokens = lexer.tokenize_source(testcase);
        // console.log(tokens);
        tokens.forEach((token) => {
          const { row: sr, col: sc, offset: so } = token.start;
          const { row: er, col: ec, offset: eo } = token.end;

          expect(sr).to.equal(er); // no individual token should span lines.

          const rc_text = testcase_lines[sr].slice(sc, ec);
          const o_text = testcase.slice(so, eo);

          // console.log(token);
          // console.log(`tkn text: "${token.text}"`);
          // console.log(`rc text: "${rc_text}"`);
          // console.log(`o text: "${o_text}"`);

          expect(token.text).to.equal(rc_text); // the token should equal the text at this row/column exactly
          expect(token.text).to.equal(o_text); // the token should equal the text at this offset exactly
        });
      }
    );
  });
});
