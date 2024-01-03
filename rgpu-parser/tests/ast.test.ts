import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { RPGUTokenizer } from "../src/cst/tokenizer";
import { RGPUDeclParser } from "../src/cst/decl-parser";
import { elaborate_ranges } from "../src/ast/build-ranges";
import { serialize_nodes, simplify_cst } from "../src/cst/utils";
import { RGPUTypechecker } from "../src/ast/build-ast";

const MIN_THROUGHPUT: number = 200_000;

describe("RGPU Abstract Syntax Tree", () => {
  let testcases: string[] = [];

  it("variable declarations should be well-formed", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();
    const checker = new RGPUTypechecker();

    const testcases = ["@attribute @syntax var a:i32 = b"];

    testcases.forEach((testcase, i) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.translation_unit();
      elaborate_ranges(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      const table = checker.check(cst);

      if (i === testcases.length - 1) console.log(table);

      // const serialized = serialize_nodes(cst);

      // expect(serialized).to.deep.equal(testcase);
    });
  });
});
