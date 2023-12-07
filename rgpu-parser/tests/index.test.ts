import { expect } from "chai";
import { parse } from "../src";

describe("WGSL Parser", () => {
  it("should parse a simple expression", () => {
    const result = parse();

    expect(result).to.deep.equal(true);
  });
});
