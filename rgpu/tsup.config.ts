import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  // NOTE(Nic): this maybe shouldn't be in the final lib?
  loader: {
    ".wgsl": "text",
  },
});
