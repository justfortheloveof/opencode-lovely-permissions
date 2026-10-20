import type { Plugin } from "@opencode/plugin";
import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";
import plugin from "../../src/index.ts";
import { emptyProjectDir } from "./sandbox.ts";

type Hook = (event: never) => unknown;

export interface PermissionRequest {
  action: string;
  resources: string[];
  effect: PermissionEvaluation["effect"];
}

export interface PermissionDecision {
  effect: PermissionEvaluation["effect"];
  message: string | undefined;
}

export interface ToolCall {
  tool: string;
  id: string;
  input: unknown;
}

export interface PluginHarness {
  /** Hook names the plugin registered, as `domain.name`, e.g. `permission.evaluate`. */
  readonly registered: string[];
  /** Runs the registered permission evaluate hook on one request and returns the effect and message it left. */
  evaluate(request: PermissionRequest): Promise<PermissionDecision>;
  /** Runs the registered tool execute-before hook, as OpenCode does when a call starts. */
  startCall(call: ToolCall): Promise<void>;
  /** Runs the registered tool execute-after hook, as OpenCode does when a call finishes. */
  finishCall(call: ToolCall): Promise<void>;
}

/**
 * Calls the plugin's setup with a fake context and returns the hooks it registered.
 * The fake records every registration, so a test can see what the plugin asked for
 * and drive those hooks the way OpenCode would. The project directory is the plugin
 * location's directory, and it defaults to one with no policy in it.
 */
export async function startPlugin(options: { directory?: string } = {}): Promise<PluginHarness> {
  const hooks = new Map<string, Hook>();
  const registered: string[] = [];
  const registration = { dispose: async () => {} };
  const register = (domain: string) => async (name: string, callback: Hook) => {
    registered.push(`${domain}.${name}`);
    hooks.set(`${domain}.${name}`, callback);
    return registration;
  };
  const context = {
    location: { directory: options.directory ?? emptyProjectDir },
    tool: { hook: register("tool") },
    permission: { hook: register("permission") },
  } as unknown as Plugin.Context;

  await plugin.setup(context);

  const runToolHook = async (name: string, call: ToolCall, extra: Record<string, unknown>) => {
    const callback = hooks.get(name) as ((event: object) => unknown) | undefined;
    if (callback === undefined) throw new Error(`the plugin did not register ${name}`);
    await callback({
      ...call,
      sessionID: "ses_test",
      agent: "build",
      messageID: "msg_test",
      ...extra,
    });
  };

  return {
    registered,
    async startCall(call) {
      await runToolHook("tool.execute.before", call, {});
    },
    async finishCall(call) {
      await runToolHook("tool.execute.after", call, { status: "completed" });
    },
    async evaluate(request) {
      const callback = hooks.get("permission.evaluate") as
        | ((event: PermissionEvaluation) => unknown)
        | undefined;
      if (callback === undefined)
        throw new Error("the plugin did not register permission.evaluate");
      const event = {
        sessionID: "ses_test" as PermissionEvaluation["sessionID"],
        resources: request.resources,
        action: request.action,
        effect: request.effect,
        message: undefined,
      } satisfies PermissionEvaluation;
      await callback(event);
      return { effect: event.effect, message: event.message };
    },
  };
}
