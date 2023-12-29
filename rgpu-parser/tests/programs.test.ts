import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { RPGUTokenizer, serialize_tokens } from "../src/tokenizer";
import { serialize_nodes, simplify_cst } from "../src/expr-parser";
import { RGPUDeclParser } from "../src/decl-parser";

describe("RGPU Translation Unit Parser", () => {
  let testcases: string[] = [];

  before("RGPU Translation Unit Parser", function (done) {
    const testcase_paths = path.join(__dirname, "wgsl");
    const files = fs.readdirSync(testcase_paths, {
      withFileTypes: true,
      encoding: "utf-8",
    });

    files
      .filter((entry) => entry.isFile() && entry.name.indexOf(".wgsl") !== -1)
      .sort()
      .forEach((entry) => {
        const file_path = path.join(entry.path, entry.name);
        const source = fs.readFileSync(file_path, "utf-8");
        testcases.push(source);
      });

    done();
  });

  it("should parse shader files", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();

    testcases.forEach((testcase, i) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.translation_unit();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });

  it(".translation_unit() should partially parse incorrect programs", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();

    const testcases = ["let a = 1.0; const a = ; 1.0", "fn main( { a"];

    testcases.forEach((testcase) => {
      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.translation_unit();

      const serialized = serialize_nodes(cst);

      // console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(serialized).to.deep.equal(testcase);
    });
  });
});
