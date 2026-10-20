import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { startPlugin, type PermissionRequest, type PluginHarness } from "./support/fake-context.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import { stubEngine } from "./support/stub-engine.ts";

type Effect = PermissionRequest["effect"];

const ALLOW_REASONS = ["command matches allowed pattern: ^git\\s+status$"];
const ASK_REASONS = ["the command matches no allowed pattern", "it writes to a file"];
const DENY_REASONS = ["the command matches a blocked pattern", "it reads /etc/passwd"];

function verdict(action: string, reasons: string[]) {
  return { protocol: 1, valid: true, action, reason: reasons.join("; "), reasons };
}

function engineAnswering(response: Record<string, unknown>) {
  const engine = stubEngine(response);
  process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = engine.path;
  return engine;
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
