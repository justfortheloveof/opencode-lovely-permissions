import { expect, test } from "vite-plus/test";
import type { Plugin } from "@opencode/plugin";
import plugin from "../src/index.ts";

test("the plugin has a stable identifier", () => {
  expect(plugin.id).toBe("lovely-bash-permissions");
});

test("setup registers no behaviour yet", () => {
  const context = new Proxy(
    {},
    {
      get: () => {
        throw new Error("setup touched the plugin context");
      },
    },
  ) as Plugin.Context;

  expect(plugin.setup(context)).toBeUndefined();
});
