import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    setupFiles: ["tests/support/setup.ts"],
    alias: {
      "opentui:runtime-module:%40opencode%2Fplugin%2Ftui": new URL(
        "./tests/support/host-plugin-runtime.ts",
        import.meta.url,
      ).pathname,
      "opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime": new URL(
        "./tests/support/host-jsx-runtime.ts",
        import.meta.url,
      ).pathname,
      "opentui:runtime-module:solid-js": new URL(
        "./tests/support/host-solid-runtime.ts",
        import.meta.url,
      ).pathname,
    },
    coverage: {
      reporter: ["text"],
    },
  },
  fmt: {
    ignorePatterns: [".scratch/**", "docs/**"],
  },
});
