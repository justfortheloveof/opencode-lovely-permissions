import { Plugin } from "@opencode/plugin";
import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";
import { commandFor, forgetCommand, recordCommand } from "./command-capture.ts";
import { EngineError, evaluate, type Verdict } from "./engine-client.ts";
import { resolveEngine } from "./engine.ts";
import { fallbackLevel } from "./fallback.ts";
import { askMessage, denyMessage, noPolicyMessage, UNMATCHED_REASON } from "./messages.ts";
import { DEFAULT_MODE, type ModePolicy } from "./policy-file.ts";
import { policyLocations, readLayeredPolicy } from "./policy-layers.ts";
import { checkStartup } from "./startup.ts";

const SHELL_ACTION = "shell";
/** Stands in for the mode when there is no valid policy. The engine is never asked then. */
const NO_MODE: ModePolicy = { bash: {}, wildcard: undefined };

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const engine = resolveEngine();
    const policy = await readLayeredPolicy(ctx.location.directory);
    if (policy.status === "valid") {
      for (const warning of policy.warnings) console.warn(warning);
    }
    const mode = policy.status === "valid" ? policy.modes[DEFAULT_MODE] : NO_MODE;
    const startup = await checkStartup(engine, policy, mode);
    const locations = policyLocations(ctx.location.directory);

    await ctx.tool.hook("execute.before", recordCommand);
    await ctx.tool.hook("execute.after", forgetCommand);
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== SHELL_ACTION) return;
      if (startup.status === "blocked") {
        deny(event, startup.message);
        return;
      }
      if (event.effect === "deny") return;
      if (policy.status === "absent") {
        event.effect = "ask";
        event.message = noPolicyMessage(locations);
        return;
      }
      const command = event.source === undefined ? undefined : commandFor(event.source.id);
      if (command === undefined) {
        deny(event, denyMessage([UNMATCHED_REASON]));
        return;
      }
      applyVerdict(event, await verdictFor(startup.engine, command, mode));
    });
  },
});

async function verdictFor(engine: string, command: string, mode: ModePolicy): Promise<Verdict> {
  try {
    return await evaluate(engine, { command, bash: mode.bash, topLevel: mode.wildcard });
  } catch (error) {
    if (!(error instanceof EngineError)) throw error;
    return {
      action: fallbackLevel(mode, "error"),
      reason: error.message,
      reasons: [error.message],
    };
  }
}

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
