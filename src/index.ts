import { Plugin } from "@opencode/plugin";
import { forgetCommand, recordCommand } from "./command-capture.ts";
import { resolveEngine } from "./engine.ts";
import { checkStartup } from "./startup.ts";

const SHELL_ACTION = "shell";

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const startup = await checkStartup(ctx.location.directory, resolveEngine());

    await ctx.tool.hook("execute.before", recordCommand);
    await ctx.tool.hook("execute.after", forgetCommand);
    await ctx.permission.hook("evaluate", (event) => {
      if (event.action !== SHELL_ACTION || startup.status === "ready") return;
      event.effect = "deny";
      event.message = startup.message;
    });
  },
});
