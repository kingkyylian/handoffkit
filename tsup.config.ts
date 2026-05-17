import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  clean: true,
  dts: true,
  format: ["esm"],
  sourcemap: true,
  target: "node22"
});
