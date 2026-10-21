import { mock } from "bun:test";

void mock.module("@opencode/plugin/tui", () => ({
  Plugin: {
    define<T>(plugin: T): T {
      return plugin;
    },
  },
}));
