import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/tokenizer";
import { RGPUExprParser, serialize_nodes } from "../src/expr-parser";

describe("RGPU Expression Parser", () => {
  it("should parse unary operators", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = ["-a", "&a * (-a + *b*b)", "~b + c", "!  !  no_op"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse function calls", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "a()",
      "a(b, c + d, true)",
      "   f(a+b , c*d/ ident) /** comment **/",
      "func(   main(), other(a-c, 0.000232 )   )",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse array accesses", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "a[0]",
      "a[i + 1]",
      "   x<array, f32>[z + 2]",
      "(&a + 1)[0]",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

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

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse logical expressions", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "a & b | b & c | a",
      "a <= b || a > c && true",
      "a || b && c",
      "a && b || c",
      "a && (b || c)",
      "a << b | c >> d",
      "true||false",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse templated identifiers", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "vec2  <u32>",
      "a<f32, T>(1.0, a<vec2<T>>)",
      "a<T> * 3.0",
      "identifier<0.32, >",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse member access", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      "a.b.c",
      "&a.b",
      "uniform.yzwx + vec4<f32>(1, 1, 1, 0).xyzw",
      "a.c << 32 | 0x4a",
    ];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it("should parse error nodes", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUExprParser();
    const testcases = [
      { input: "a(32", parse: "a(32", remaining: "" },
      {
        input: "id(32 /** comment ***/ ;",
        parse: "id(32 /** comment ***/ ",
        remaining: ";",
      },
      {
        input: "a * b b;",
        parse: "a * b ",
        remaining: "b;",
      },
    ];

    testcases.forEach(({ input, parse, remaining }) => {
      const tokens = lexer.tokenize_source(input);

      // if you need to debug token stream...
      // console.log(tokens);

      const cst = parser.parse(tokens);
      const { tokens: remaining_tokens } = parser.remaining();

      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(JSON.stringify(cst, null, 4));

      expect(serialize_nodes(cst)).to.deep.equal(parse);
      expect(serialize_tokens(remaining_tokens)).to.deep.equal(remaining);
    });
  });
});
