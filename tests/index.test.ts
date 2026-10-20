import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";
import { startPlugin } from "./support/fake-context.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import { stubEngine, type StubEngine } from "./support/stub-engine.ts";

const NOT_FOUND_DENIAL = [
  "[♡ perms: ❤️ auto-rejected]",
  "- lovely-pi-bash-permissions was not found. Install it with `uv tool install lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to the path of an existing engine binary.",
  "The tool has not been run.",
].join("\n");

const BASH = { "*": "ask", allowed_cmds_regex: ["^git\\s+status$"] };

const UNKNOWN_KEY_ERROR =
  "Value error, unknown bash config key 'permission'; valid keys are '*', 'allowed_cmds_regex', 'background_execution', 'blocked_cmds_regex', 'command_substitution', 'error', 'input_redirection', 'output_redirection', 'process_substitution', 'subshell', 'variable_assignment'";

function useEngine(response: Record<string, unknown> | string): StubEngine {
  const engine = stubEngine(response);
  process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = engine.path;
  return engine;
}

function projectWith(policy: unknown): string {
  const directory = mkdtempSync(join(sandboxRoot, "project-"));
  mkdirSync(join(directory, ".opencode"));
  writeFileSync(join(directory, ".opencode", "lovely-permissions.jsonc"), JSON.stringify(policy));
  return directory;
}

test("the plugin has a stable identifier", () => {
  expect(plugin.id).toBe("lovely-bash-permissions");
});

test("setup registers the shell execute-before and execute-after hooks and the permission evaluate hook", async () => {
  const harness = await startPlugin();
  expect([...harness.registered].sort()).toEqual([
    "permission.evaluate",
    "tool.execute.after",
    "tool.execute.before",
  ]);
});

describe("when no engine can be found", () => {
  test("a shell call is denied with the install fix", async () => {
    const harness = await startPlugin();
    const decision = await harness.evaluate({
      action: "shell",
      resources: ["git status"],
      effect: "allow",
    });
    expect(decision).toEqual({ effect: "deny", message: NOT_FOUND_DENIAL });
  });

  test("an override that names a missing file does not count as an engine", async () => {
    process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = join(
      sandboxRoot,
      "missing",
      "lovely-pi-bash-permissions",
    );
    const harness = await startPlugin();
    const decision = await harness.evaluate({
      action: "shell",
      resources: ["git status"],
      effect: "allow",
    });
    expect(decision).toEqual({ effect: "deny", message: NOT_FOUND_DENIAL });
  });

  test("other actions are left alone", async () => {
    const harness = await startPlugin();
    const decision = await harness.evaluate({
      action: "read",
      resources: ["/etc/hosts"],
      effect: "allow",
    });
    expect(decision).toEqual({ effect: "allow", message: undefined });
  });
});

describe("when the policy is valid", () => {
  test("setup sends the default mode's bash block to the engine's validate operation", async () => {
    const engine = useEngine({ protocol: 1, valid: true });
    await startPlugin(projectWith({ default: { bash: BASH } }));
    expect(engine.requests()).toEqual([{ op: "validate", config: BASH }]);
  });

  test("the bash block sent is merged from the global and project files", async () => {
    const globalDir = mkdtempSync(join(sandboxRoot, "global-"));
    writeFileSync(
      join(globalDir, "lovely-permissions.jsonc"),
      JSON.stringify({ default: { bash: { "*": "ask", subshell: "deny" } } }),
    );
    process.env.OPENCODE_CONFIG_DIR = globalDir;
    const engine = useEngine({ protocol: 1, valid: true });
    await startPlugin(
      projectWith({ default: { bash: { allowed_cmds_regex: ["^git\\s+status$"] } } }),
    );
    expect(engine.requests()).toEqual([
      {
        op: "validate",
        config: { "*": "ask", subshell: "deny", allowed_cmds_regex: ["^git\\s+status$"] },
      },
    ]);
  });

  test("the plugin stays unblocked, so the engine's verdict is applied to a shell call", async () => {
    const reason = "the command matches no allowed pattern";
    useEngine({ protocol: 1, valid: true, action: "ask", reason, reasons: [reason] });
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    await harness.startCall({ tool: "shell", id: "call_valid", input: { command: "rm -rf /" } });
    await expect(
      harness.evaluate({
        action: "shell",
        resources: ["rm -rf /"],
        effect: "allow",
        source: { type: "tool", messageID: "msg_test", id: "call_valid" },
      }),
    ).resolves.toEqual({
      effect: "ask",
      message: "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern",
    });
  });
});

describe("when the engine rejects the policy", () => {
  test("an unknown key denies every shell call, naming the key and listing the valid keys", async () => {
    useEngine({ protocol: 1, valid: false, error: UNKNOWN_KEY_ERROR });
    const harness = await startPlugin(projectWith({ default: { bash: { permission: "allow" } } }));
    const denial = [
      "[♡ perms: ❤️ auto-rejected]",
      `- the bash engine rejected the policy: ${UNKNOWN_KEY_ERROR}. Fix what it names, then restart OpenCode.`,
      "The tool has not been run.",
    ].join("\n");
    await expect(
      harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).resolves.toEqual({ effect: "deny", message: denial });
    await expect(
      harness.evaluate({ action: "shell", resources: ["rm -rf /"], effect: "allow" }),
    ).resolves.toEqual({ effect: "deny", message: denial });
    await expect(
      harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).resolves.toEqual({ effect: "allow", message: undefined });
  });

  test("a bad level value denies every shell call, naming the key", async () => {
    useEngine({
      protocol: 1,
      valid: false,
      error: "*: Input should be 'allow', 'deny' or 'ask' (got 'alow')",
    });
    const harness = await startPlugin(projectWith({ default: { bash: { "*": "alow" } } }));
    await expect(
      harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).resolves.toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        "- the bash engine rejected the policy: *: Input should be 'allow', 'deny' or 'ask' (got 'alow'). Fix what it names, then restart OpenCode.",
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});

describe("when the policy file cannot be read or parsed", () => {
  test("a file with no default mode denies every shell call, naming the file", async () => {
    useEngine({ protocol: 1, valid: true });
    const directory = projectWith({ build: { bash: BASH } });
    const file = join(directory, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(directory);
    await expect(
      harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).resolves.toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: it has no "default" mode. Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});

describe("when the engine cannot check the policy", () => {
  test("a shell call is denied with the engine fix", async () => {
    useEngine("engine: unexpected output\n");
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    await expect(
      harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).resolves.toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        "- the bash engine could not check the policy: the engine did not answer with one JSON object. Reinstall it with `uv tool install lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to a working engine binary, then restart OpenCode.",
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});
