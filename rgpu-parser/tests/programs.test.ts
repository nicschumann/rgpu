import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { RPGUTokenizer } from "../src/cst/tokenizer";
import { RGPUDeclParser } from "../src/cst/decl-parser";
import { elaborate_ranges } from "../src/ast/build-ranges";
import { serialize_nodes, simplify_cst } from "../src/cst/utils";

const MIN_THROUGHPUT: number = 200_000;

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
      const t_s = performance.now();

      const tokens = lexer.tokenize_source(testcase);

      // if you need to debug token stream...
      // console.log(tokens);
      parser.reset(tokens);
      const cst = parser.translation_unit();
      elaborate_ranges(cst);

      const t_e = performance.now();

      const seconds_elapsed = (t_e - t_s) / 1000;
      const throughput = Math.floor(tokens.length / seconds_elapsed);
      // console.log(throughput);
      // console.log(
      //   `parse ${tokens.length} tkns: ${(seconds_elapsed * 1000).toFixed(4)} ms`
      // );
      // console.log(`throughput: ${throughput} tkns/s\n`);

      const serialized = serialize_nodes(cst);

      // if (i == testcases.length - 1) console.log(JSON.stringify(cst, null, 4));
      // console.log(JSON.stringify(simplify_cst(cst), null, 4));
      // console.log(parser.remaining());

      expect(throughput).to.be.greaterThanOrEqual(
        MIN_THROUGHPUT,
        `${throughput.toLocaleString(
          "en-US"
        )} tkns/s below ${MIN_THROUGHPUT.toLocaleString("en-US")} tkns/s`
      );
      expect(serialized).to.deep.equal(testcase);
    });
  });

  it(".translation_unit() should partially parse incorrect programs", () => {
    const lexer = new RPGUTokenizer();
    const parser = new RGPUDeclParser();

    const testcases = [
      "let a = 1.0; const a = ; 1.0",
      "fn main( { a",
      "var<storage> a: i32; for (let a = (a + b); a <; a += ) { let a = 1",
      "{ f(x, y, z + 10); }",
    ];

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
