import { Plugin } from "@opencode/plugin";
import { resolveEngine } from "./engine.ts";
import { denyMessage, ENGINE_NOT_FOUND_REASON } from "./messages.ts";

const SHELL_ACTION = "shell";

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const engine = resolveEngine();
    const blocked = engine === undefined ? denyMessage([ENGINE_NOT_FOUND_REASON]) : undefined;

    await ctx.tool.hook("execute.before", () => {});
    await ctx.permission.hook("evaluate", (event) => {
      if (event.action !== SHELL_ACTION || blocked === undefined) return;
      event.effect = "deny";
      event.message = blocked;
    });
  },
});
