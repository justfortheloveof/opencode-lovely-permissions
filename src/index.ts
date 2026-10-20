import { Plugin } from "@opencode/plugin";
import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";
import { commandFor, forgetCommand, recordCommand } from "./command-capture.ts";
import { evaluate, type Verdict } from "./engine-client.ts";
import { resolveEngine } from "./engine.ts";
import {
  askMessage,
  denyMessage,
  ENGINE_NOT_FOUND_REASON,
  invalidPolicyReason,
  UNMATCHED_REASON,
} from "./messages.ts";
import { readLayeredPolicy } from "./policy-layers.ts";
import { DEFAULT_MODE, type ModePolicy } from "./policy-file.ts";

const SHELL_ACTION = "shell";
const ABSENT_POLICY: ModePolicy = { bash: {}, wildcard: "ask" };

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const engine = resolveEngine();
    const policy = await readLayeredPolicy(ctx.location.directory);
    const mode = policy.status === "valid" ? policy.modes[DEFAULT_MODE] : ABSENT_POLICY;

    await ctx.tool.hook("execute.before", recordCommand);
    await ctx.tool.hook("execute.after", forgetCommand);
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== SHELL_ACTION) return;
      if (engine === undefined) {
        deny(event, denyMessage([ENGINE_NOT_FOUND_REASON]));
        return;
      }
      if (policy.status === "invalid") {
        deny(event, denyMessage([invalidPolicyReason(policy.file, policy.reason)]));
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
        await evaluate(engine, { command, bash: mode.bash, topLevel: mode.wildcard }),
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
