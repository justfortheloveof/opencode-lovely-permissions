/// <reference types="bun" />

import solidPlugin from "@opentui/solid/bun-plugin";

const result = await Bun.build({
  entrypoints: ["./src/tui.tsx"],
  outdir: "./dist",
  naming: "[name].js",
  target: "bun",
  format: "esm",
  plugins: [solidPlugin],
  external: ["@opencode/plugin/tui", "@opentui/solid", "solid-js"],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exitCode = 1;
}
