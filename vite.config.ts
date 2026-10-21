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
      "@opencode/plugin/tui": new URL("./tests/support/host-plugin-runtime.ts", import.meta.url)
        .pathname,
      "@opentui/solid/jsx-runtime": new URL("./tests/support/host-jsx-runtime.ts", import.meta.url)
        .pathname,
      "solid-js": new URL("./tests/support/host-solid-runtime.ts", import.meta.url).pathname,
    },
    coverage: {
      reporter: ["text"],
    },
  },
  fmt: {
    ignorePatterns: [".scratch/**", "docs/**"],
  },
});
