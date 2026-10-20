import { Plugin } from "@opencode/plugin";
import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";
import { commandFor, forgetCommand, recordCommand } from "./command-capture.ts";
import { evaluate, type Verdict } from "./engine-client.ts";
import { resolveEngine } from "./engine.ts";
import { askMessage, denyMessage, UNMATCHED_REASON } from "./messages.ts";
import { DEFAULT_MODE, type ModePolicy } from "./policy-file.ts";
import { readLayeredPolicy } from "./policy-layers.ts";
import { checkStartup } from "./startup.ts";

const SHELL_ACTION = "shell";
const ABSENT_POLICY: ModePolicy = { bash: {}, wildcard: "ask" };

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const engine = resolveEngine();
    const policy = await readLayeredPolicy(ctx.location.directory);
    const mode = policy.status === "valid" ? policy.modes[DEFAULT_MODE] : ABSENT_POLICY;
    const startup = await checkStartup(engine, policy, mode);

    await ctx.tool.hook("execute.before", recordCommand);
    await ctx.tool.hook("execute.after", forgetCommand);
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== SHELL_ACTION) return;
      if (startup.status === "blocked") {
        deny(event, startup.message);
        return;
      }
      if (event.effect === "deny") return;
      const command = event.source === undefined ? undefined : commandFor(event.source.id);
      if (command === undefined) {
        deny(event, denyMessage([UNMATCHED_REASON]));
        return;
      }
      applyVerdict(
        event,
        await evaluate(startup.engine, { command, bash: mode.bash, topLevel: mode.wildcard }),
      );
    });
  },
});

function applyVerdict(event: PermissionEvaluation, verdict: Verdict): void {
  if (verdict.action === "allow") {
    event.effect = "allow";
  } else if (verdict.action === "ask") {
    event.effect = "ask";
    event.message = askMessage(verdict.reasons);
  } else {
    deny(event, denyMessage(verdict.reasons));
  }
}

function deny(event: PermissionEvaluation, message: string): void {
  event.effect = "deny";
  event.message = message;
}
