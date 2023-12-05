import { setup } from "../src/index";

describe("GPU", function () {
  describe("resources are available:", function () {
    it("can acquire adapter", async function () {
      chai.assert.strictEqual(true, typeof navigator.gpu !== "undefined");
    });

    it("navigator.gpu is defined", async function () {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();

      chai.assert.strictEqual(
        true,
        device !== null && typeof device !== "undefined"
      );
    });

    it("builds properly", async function () {
      const device = await setup();

      chai.assert.strictEqual(true, device !== null);
    });
  });
});
