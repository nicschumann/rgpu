describe("GPU", () => {
  describe("resources are available:", () => {
    it("can acquire adapter", async () => {
      assert.equal(true, typeof navigator.gpu !== "undefined");
    });

    it("navigator.gpu is defined", async () => {
      const adapter = await navigator.gpu.requestAdapter();
      const device = await adapter.requestDevice();

      assert.equal(true, device !== null && typeof device !== "undefined");
    });
  });
});
