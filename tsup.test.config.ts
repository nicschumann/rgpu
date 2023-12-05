import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["tests/index.test.ts"],
  outDir: "tests/dist",
  format: ["cjs", "esm"],
  dts: false,
  sourcemap: true,
});
