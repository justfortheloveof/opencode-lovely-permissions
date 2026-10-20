import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { startPlugin, type PermissionRequest, type PluginHarness } from "./support/fake-context.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import {
  NEVER_ANSWERS,
  stubEngine,
  type StubEngine,
  type StubReply,
} from "./support/stub-engine.ts";

type Effect = PermissionRequest["effect"];

const ALLOW_REASONS = ["command matches allowed pattern: ^git\\s+status$"];
const ASK_REASONS = ["the command matches no allowed pattern", "it writes to a file"];
const DENY_REASONS = ["the command matches a blocked pattern", "it reads /etc/passwd"];

function verdict(action: string, reasons: string[]) {
  return { protocol: 1, valid: true, action, reason: reasons.join("; "), reasons };
}

function engineAnswering(response: StubReply, byCommand?: Record<string, StubReply>) {
  const engine = stubEngine(response, byCommand);
  process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = engine.path;
  return engine;
}

/** The evaluate requests the engine received. Startup also sends one validate request, which is not counted here. */
function evaluations(engine: StubEngine) {
  return engine.requests().filter((request) => request.op === "evaluate");
}

function projectWithPolicy(policy: string): string {
  const directory = mkdtempSync(join(sandboxRoot, "project-"));
  mkdirSync(join(directory, ".opencode"));
  writeFileSync(join(directory, ".opencode", "lovely-permissions.jsonc"), policy);
  return directory;
}

/** Starts a shell call for the command, then runs the permission hook on it with OpenCode's own effect. */
async function judge(harness: PluginHarness, id: string, command: string, effect: Effect) {
  await harness.startCall({ tool: "shell", id, input: { command } });
  return harness.evaluate({
    action: "shell",
    resources: [command],
    effect,
    source: { type: "tool", messageID: "msg_test", id },
  });
}

describe("allow", () => {
  test("an allow verdict sets the allow effect and no message", async () => {
    engineAnswering(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_allow", "git status", "allow")).toEqual({
      effect: "allow",
      message: undefined,
    });
  });

  test("an allow verdict replaces OpenCode's ask", async () => {
    engineAnswering(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_allow_over_ask", "git status", "ask")).toEqual({
      effect: "allow",
      message: undefined,
    });
  });
});

describe("ask", () => {
  test("an ask verdict sets the ask effect, the ask label, and one bullet per reason in the engine's order", async () => {
    engineAnswering(verdict("ask", ASK_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_ask", "cat notes > out.txt", "allow")).toEqual({
      effect: "ask",
      message:
        "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern\n- it writes to a file",
    });
  });
});

describe("deny", () => {
  test("a deny verdict sets the deny effect, the deny label, one bullet per reason, and the closing sentence", async () => {
    engineAnswering(verdict("deny", DENY_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_deny", "cat /etc/passwd", "allow")).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command matches a blocked pattern\n- it reads /etc/passwd\nThe tool has not been run.",
    });
  });

  test("a deny verdict replaces OpenCode's ask", async () => {
    engineAnswering(verdict("deny", DENY_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_deny_over_ask", "cat /etc/passwd", "ask")).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command matches a blocked pattern\n- it reads /etc/passwd\nThe tool has not been run.",
    });
  });
});

describe("OpenCode's explicit deny", () => {
  test("is not replaced by an allow verdict", async () => {
    engineAnswering(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin();
    expect(await judge(harness, "call_explicit_deny", "git status", "deny")).toEqual({
      effect: "deny",
      message: undefined,
    });
  });
});

describe("the engine request", () => {
  test("gets the whole command line as captured, with the bash block and the mode's wildcard unchanged", async () => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS));
    const bash = {
      "*": "deny",
      allowed_cmds_regex: ["^git\\s+status$"],
      output_redirection: { "*": "ask", stdout_to_dev_null: "allow" },
    };
    const harness = await startPlugin(
      projectWithPolicy(JSON.stringify({ default: { "*": "allow", bash } })),
    );
    const command = "echo hi | cat > out.txt && git status ";
    await judge(harness, "call_request", command, "ask");
    expect(engine.requests()).toEqual([
      { op: "validate", config: bash },
      { op: "evaluate", command, config: bash, top_level: "allow" },
    ]);
  });

  test("with no policy file, the engine is checked with an empty bash block, then asked with the wildcard ask", async () => {
    const engine = engineAnswering(verdict("ask", ASK_REASONS));
    const harness = await startPlugin();
    await judge(harness, "call_no_policy", "git status", "allow");
    expect(engine.requests()).toEqual([
      { op: "validate", config: {} },
      { op: "evaluate", command: "git status", config: {}, top_level: "ask" },
    ]);
  });
});

describe("an invalid policy file", () => {
  test("denies every shell call, naming the file, without asking the engine", async () => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS));
    const project = projectWithPolicy(JSON.stringify({ strict: { "*": "allow" } }));
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    expect(await judge(harness, "call_invalid_policy", "git status", "allow")).toEqual({
      effect: "deny",
      message: `[♡ perms: ❤️ auto-rejected]\n- the policy file ${file} could not be used: it has no "default" mode. Fix the file and restart OpenCode.\nThe tool has not been run.`,
    });
    expect(engine.requests()).toEqual([]);
  });
});

describe("a shell call with no captured command", () => {
  test("is denied as unmatched, without asking the engine for a verdict", async () => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin();
    expect(
      await harness.evaluate({
        action: "shell",
        resources: ["git status"],
        effect: "allow",
        source: { type: "tool", messageID: "msg_test", id: "call_never_started" },
      }),
    ).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command could not be matched to its tool call\nThe tool has not been run.",
    });
    expect(engine.requests()).toEqual([{ op: "validate", config: {} }]);
  });
});

describe("an engine error for one command", () => {
  const ENGINE_FAILURE = { protocol: 1, valid: false, error: "internal error: KeyError: 'op'" };
  const ASKED = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- internal error: KeyError: 'op'";
  const DENIED =
    "[♡ perms: ❤️ auto-rejected]\n- internal error: KeyError: 'op'\nThe tool has not been run.";

  test.each([
    [
      "takes the bash block's own error level ahead of its * and the mode's *",
      { "*": "allow", bash: { "*": "allow", error: "deny" } },
      { effect: "deny", message: DENIED },
    ],
    [
      "takes the bash block's * when it has no error level, ahead of the mode's *",
      { "*": "allow", bash: { "*": "deny" } },
      { effect: "deny", message: DENIED },
    ],
    [
      "takes the mode's * when the bash block sets neither",
      { "*": "deny", bash: {} },
      { effect: "deny", message: DENIED },
    ],
    ["asks when no level is set anywhere", { bash: {} }, { effect: "ask", message: ASKED }],
    [
      "allows when its error level is allow",
      { "*": "deny", bash: { error: "allow", "*": "deny" } },
      { effect: "allow", message: undefined },
    ],
  ])("%s", async (_, mode, expected) => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS), { "rm -rf /": ENGINE_FAILURE });
    const harness = await startPlugin(projectWithPolicy(JSON.stringify({ default: mode })));
    expect(await judge(harness, "call_engine_error", "rm -rf /", "allow")).toEqual(expected);
    expect(evaluations(engine)).toHaveLength(1);
  });

  test("a parse failure the engine answers as a verdict is applied as the engine gave it", async () => {
    const reason =
      "error evaluating command (policy 'deny'): Failed to parse: 1:4: `((` can only be used to open an arithmetic cmd";
    engineAnswering(verdict("deny", [reason]));
    const harness = await startPlugin(
      projectWithPolicy(JSON.stringify({ default: { "*": "ask", bash: { error: "deny" } } })),
    );
    expect(await judge(harness, "call_parse_failure", "((", "allow")).toEqual({
      effect: "deny",
      message: `[♡ perms: ❤️ auto-rejected]\n- ${reason}\nThe tool has not been run.`,
    });
  });

  test("the next command after the failure is evaluated normally", async () => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS), { "rm -rf /": ENGINE_FAILURE });
    const harness = await startPlugin(
      projectWithPolicy(JSON.stringify({ default: { "*": "ask", bash: { error: "deny" } } })),
    );
    expect(await judge(harness, "call_failed_first", "rm -rf /", "allow")).toEqual({
      effect: "deny",
      message: DENIED,
    });
    expect(await judge(harness, "call_after_failure", "git status", "ask")).toEqual({
      effect: "allow",
      message: undefined,
    });
    expect(evaluations(engine).map((request) => request.command)).toEqual([
      "rm -rf /",
      "git status",
    ]);
  });
});

describe("an engine that does not answer within 5 seconds", () => {
  const TIMED_OUT_DENIED =
    "[♡ perms: ❤️ auto-rejected]\n- the engine did not answer within 5 seconds\nThe tool has not been run.";

  test("is killed, and the command takes the bash block's error level", async () => {
    const engine = engineAnswering(verdict("allow", ALLOW_REASONS), { "sleep 100": NEVER_ANSWERS });
    const harness = await startPlugin(
      projectWithPolicy(
        JSON.stringify({ default: { "*": "allow", bash: { "*": "allow", error: "deny" } } }),
      ),
    );
    expect(await judge(harness, "call_timeout", "sleep 100", "allow")).toEqual({
      effect: "deny",
      message: TIMED_OUT_DENIED,
    });
    expect(engine.hung()).toHaveLength(1);
    const alive = (pid: number) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    expect(alive(engine.hung()[0])).toBe(false);
  }, 15_000);

  test("the next command after the timeout is evaluated normally", async () => {
    engineAnswering(verdict("allow", ALLOW_REASONS), { "sleep 100": NEVER_ANSWERS });
    const harness = await startPlugin(
      projectWithPolicy(JSON.stringify({ default: { "*": "ask", bash: { error: "deny" } } })),
    );
    expect(await judge(harness, "call_timed_out", "sleep 100", "allow")).toEqual({
      effect: "deny",
      message: TIMED_OUT_DENIED,
    });
    expect(await judge(harness, "call_after_timeout", "git status", "ask")).toEqual({
      effect: "allow",
      message: undefined,
    });
  }, 15_000);
});
