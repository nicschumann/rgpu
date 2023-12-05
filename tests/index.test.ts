import { setup } from "../src/index";

describe("GPU", () => {
  describe("resources are available:", () => {
    it("can acquire adapter", async () => {
      chai.assert.strictEqual(true, typeof navigator.gpu !== "undefined");
    });

    it("navigator.gpu is defined", async () => {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();

      chai.assert.strictEqual(
        true,
        device !== null && typeof device !== "undefined"
      );
    });

    it("builds properly", async () => {
      const device = await setup();

      chai.assert.strictEqual(true, device !== null);
    });
  });
});
