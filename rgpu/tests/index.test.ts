import { setup } from "../src/index";

describe("GPU", function () {
  describe("resources are available:", function () {
    it("navigator.gpu is defined", async function () {
      chai.assert.strictEqual(true, typeof navigator.gpu !== "undefined");
    });

    it("library setup doesn't throw", async function () {
      const canvas = document.createElement("canvas");

      const dpr = window.devicePixelRatio;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      const device = await setup({ canvas });

      chai.assert.strictEqual(true, device !== null);
    });
  });
});
