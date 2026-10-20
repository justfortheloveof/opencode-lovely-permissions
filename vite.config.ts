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
    coverage: {
      reporter: ["text"],
    },
  },
  fmt: {
    ignorePatterns: [".scratch/**", "docs/**"],
  },
});
