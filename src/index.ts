import { Plugin } from "@opencode/plugin";
import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";
import { commandFor, forgetCommand, recordCommand } from "./command-capture.ts";
import { EngineError, evaluate, ProtocolMismatchError, type Verdict } from "./engine-client.ts";
import { resolveEngine } from "./engine.ts";
import { fallbackLevel, levelOf } from "./fallback.ts";
import {
  askMessage,
  denyMessage,
  noPolicyMessage,
  protocolMismatchReason,
  UNMATCHED_REASON,
} from "./messages.ts";
import { selectMode } from "./mode.ts";
import { DEFAULT_MODE, type ModePolicy } from "./policy-file.ts";
import { policyLocations } from "./policy-locations.ts";
import { bashSources, layeredPolicy, readLayers } from "./policy-layers.ts";
import { checkStartup, failure } from "./startup.ts";

const SHELL_ACTION = "shell";

export default Plugin.define({
  id: "lovely-bash-permissions",
  async setup(ctx) {
    const engine = resolveEngine();
    const directory = ctx.location.directory;
    const mode = String(ctx.options.mode ?? DEFAULT_MODE);
    const locations = policyLocations(directory);
    const layers = await readLayers(locations);
    const policy = layeredPolicy(layers);
    if (policy.status === "valid") {
      for (const warning of policy.warnings) console.warn(warning);
    }
    let startup = await checkStartup(engine, selectMode(policy, mode), bashSources(layers, mode));

    await ctx.tool.hook("execute.before", recordCommand);
    await ctx.tool.hook("execute.after", forgetCommand);
    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== SHELL_ACTION) return;
      if (startup.status === "failed") {
        deny(event, startup.message);
        return;
      }
      if (event.effect === "deny") return;
      if (startup.status === "no-policy") {
        event.effect = "ask";
        event.message = noPolicyMessage(locations);
        return;
      }
      const command = event.source === undefined ? undefined : commandFor(event.source.id);
      if (command === undefined) {
        deny(event, denyMessage([UNMATCHED_REASON]));
        return;
      }
      try {
        applyVerdict(event, await verdictFor(startup.engine, command, startup.mode));
      } catch (error) {
        if (!(error instanceof ProtocolMismatchError)) throw error;
        startup = failure(protocolMismatchReason(error.found));
        deny(event, startup.message);
      }
    });
  },
});

async function verdictFor(engine: string, command: string, mode: ModePolicy): Promise<Verdict> {
  try {
    return await evaluate(engine, {
      command,
      bash: mode.bash,
      topLevel: levelOf(mode.wildcard),
    });
  } catch (error) {
    // A protocol mismatch is not a per-command error: it fails the plugin instead.
    if (!(error instanceof EngineError) || error instanceof ProtocolMismatchError) throw error;
    return {
      action: fallbackLevel(mode, "error"),
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
