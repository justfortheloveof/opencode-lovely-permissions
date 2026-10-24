import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, spyOn, test } from "bun:test";
import plugin from "../src/index.ts";
import { judge, startPlugin } from "./support/fake-context.ts";
import { projectWith, projectWithText } from "./support/project.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import { crashingEngine, evaluations, useEngine, type StubReply } from "./support/stub-engine.ts";

const NOT_FOUND_DENIAL = [
  "[♡ perms: ❤️ auto-rejected]",
  "- lovely-pi-bash-permissions was not found. Install it with `uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to the path of an existing engine binary.",
  "The tool has not been run.",
].join("\n");

const BASH = { "*": "ask", allowed_cmds_regex: ["^git\\s+status$"] };

const UNKNOWN_KEY_ERROR =
  "Value error, unknown bash config key 'permission'; valid keys are '*', 'allowed_cmds_regex', 'background_execution', 'blocked_cmds_regex', 'command_substitution', 'error', 'input_redirection', 'output_redirection', 'process_substitution', 'subshell', 'variable_assignment'";

const BAD_LEVEL_ERROR = "*: Input should be 'allow', 'deny' or 'ask' (got 'alow')";

const ALLOWED = {
  protocol: 1,
  valid: true,
  action: "allow",
  reason: "allowed",
  reasons: ["allowed"],
};

/** Validate replies that reject one bash block, keyed the way the stub matches them. */
function rejecting(bash: Record<string, unknown>, error: string): Record<string, StubReply> {
  return { [JSON.stringify(bash)]: { protocol: 1, valid: false, error } };
}

test("the plugin has a stable identifier", () => {
  expect(plugin.id).toBe("lovely-bash-permissions");
});

test("setup registers the permission hooks and the Mode RPC", async () => {
  const harness = await startPlugin();
  expect([...harness.registered].sort()).toEqual([
    "permission.evaluate",
    "rpc.lovely-bash-permissions",
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
    expect(engine.requests()).toEqual([
      { op: "validate", config: BASH },
      { op: "validate", config: BASH },
    ]);
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
      { op: "validate", config: { "*": "ask", subshell: "deny" } },
      { op: "validate", config: { allowed_cmds_regex: ["^git\\s+status$"] } },
      {
        op: "validate",
        config: { "*": "ask", subshell: "deny", allowed_cmds_regex: ["^git\\s+status$"] },
      },
    ]);
  });

  test("the plugin is not failed, so the engine's verdict is applied to a shell call", async () => {
    const reason = "the command matches no allowed pattern";
    useEngine({ protocol: 1, valid: true, action: "ask", reason, reasons: [reason] });
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    await harness.startCall({ tool: "shell", id: "call_valid", input: { command: "rm -rf /" } });
    expect(
      await harness.evaluate({
        action: "shell",
        resources: ["rm -rf /"],
        effect: "allow",
        source: { type: "tool", messageID: "msg_test", id: "call_valid" },
      }),
    ).toEqual({
      effect: "ask",
      message: "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern",
    });
  });

  test("a scalar that a later file overrides is logged as a warning at setup", async () => {
    const globalDir = mkdtempSync(join(sandboxRoot, "global-"));
    writeFileSync(
      join(globalDir, "lovely-permissions.jsonc"),
      JSON.stringify({ default: { bash: { "*": "allow" } } }),
    );
    process.env.OPENCODE_CONFIG_DIR = globalDir;
    useEngine({ protocol: 1, valid: true });
    const directory = projectWith({ default: { bash: { "*": "deny" } } });
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    try {
      await startPlugin(directory);
      expect(warn).toHaveBeenCalledWith(
        `the policy key default.bash.* in ${join(directory, ".opencode", "lovely-permissions.jsonc")} overrides the value set in ${join(globalDir, "lovely-permissions.jsonc")}`,
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("when the mode option is set", () => {
  const STRICT = { "*": "deny", allowed_cmds_regex: ["^ls$"] };
  const UNKNOWN_MODE_DENIAL = [
    "[♡ perms: ❤️ auto-rejected]",
    '- the mode option selects "strict", but no policy file defines that mode. The modes that exist are: "default", "personal". Set the mode option to one of them, then restart OpenCode.',
    "The tool has not been run.",
  ].join("\n");

  function policyWithStrict(): string {
    return projectWith({
      default: { "*": "ask", bash: BASH },
      personal: { "*": "allow" },
      strict: { "*": "deny", bash: STRICT },
    });
  }

  test("the named mode's bash block and wildcard are sent to the engine with each shell call", async () => {
    const engine = useEngine(ALLOWED);
    const harness = await startPlugin(policyWithStrict(), { mode: "strict" });
    await judge(harness, "call_strict", "ls");
    expect(engine.requests()).toContainEqual({ op: "validate", config: STRICT });
    expect(evaluations(engine)).toEqual([
      { op: "evaluate", command: "ls", config: STRICT, top_level: "deny" },
    ]);
  });

  test("with no mode option, the default mode is used", async () => {
    const engine = useEngine(ALLOWED);
    const harness = await startPlugin(policyWithStrict());
    await judge(harness, "call_default", "ls");
    expect(evaluations(engine)).toEqual([
      { op: "evaluate", command: "ls", config: BASH, top_level: "ask" },
    ]);
  });

  test("the mode is read once at setup, so changing the option afterwards has no effect", async () => {
    const engine = useEngine(ALLOWED);
    const options: Record<string, unknown> = { mode: "default" };
    const harness = await startPlugin(policyWithStrict(), options);
    options.mode = "strict";
    await judge(harness, "call_after_change", "ls");
    expect(evaluations(engine)).toEqual([
      { op: "evaluate", command: "ls", config: BASH, top_level: "ask" },
    ]);
  });

  test("a selected mode that does not exist denies every shell call, naming the mode and listing the modes that exist", async () => {
    const engine = useEngine(ALLOWED);
    const harness = await startPlugin(
      projectWith({ default: { bash: BASH }, personal: { "*": "allow" } }),
      { mode: "strict" },
    );
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: UNKNOWN_MODE_DENIAL });
    expect(
      await harness.evaluate({ action: "shell", resources: ["rm -rf /"], effect: "ask" }),
    ).toEqual({ effect: "deny", message: UNKNOWN_MODE_DENIAL });
    expect(
      await harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).toEqual({ effect: "allow", message: undefined });
    expect(engine.requests()).toEqual([]);
  });
});

describe("when the engine rejects the policy", () => {
  test("an unknown key denies every shell call, naming the file, the key, and the valid keys", async () => {
    useEngine({ protocol: 1, valid: false, error: UNKNOWN_KEY_ERROR });
    const project = projectWith({ default: { bash: { permission: "allow" } } });
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    const denial = [
      "[♡ perms: ❤️ auto-rejected]",
      `- the bash engine rejected the policy file ${file}: ${UNKNOWN_KEY_ERROR}. Fix what it names, then restart OpenCode.`,
      "The tool has not been run.",
    ].join("\n");
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: denial });
    expect(
      await harness.evaluate({ action: "shell", resources: ["rm -rf /"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: denial });
    expect(
      await harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).toEqual({ effect: "allow", message: undefined });
  });

  test("a bad level value denies every shell call, naming the file and the key", async () => {
    useEngine({ protocol: 1, valid: false, error: BAD_LEVEL_ERROR });
    const project = projectWith({ default: { bash: { "*": "alow" } } });
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the bash engine rejected the policy file ${file}: ${BAD_LEVEL_ERROR}. Fix what it names, then restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("the file a rejected key came from is named, even when a later file overrides that key", async () => {
    const globalDir = mkdtempSync(join(sandboxRoot, "global-"));
    const globalFile = join(globalDir, "lovely-permissions.jsonc");
    writeFileSync(globalFile, JSON.stringify({ default: { bash: { "*": "alow" } } }));
    process.env.OPENCODE_CONFIG_DIR = globalDir;
    useEngine(
      { protocol: 1, valid: true },
      { byConfig: rejecting({ "*": "alow" }, BAD_LEVEL_ERROR) },
    );
    const harness = await startPlugin(projectWith({ default: { bash: { "*": "deny" } } }));
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the bash engine rejected the policy file ${globalFile}: ${BAD_LEVEL_ERROR}. Fix what it names, then restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a merged block the engine rejects, though each file passes on its own, names the files it merges", async () => {
    const globalDir = mkdtempSync(join(sandboxRoot, "global-"));
    const globalFile = join(globalDir, "lovely-permissions.jsonc");
    writeFileSync(globalFile, JSON.stringify({ default: { bash: { "*": "ask" } } }));
    process.env.OPENCODE_CONFIG_DIR = globalDir;
    const project = projectWith({ default: { bash: { subshell: "deny" } } });
    const projectFile = join(project, ".opencode", "lovely-permissions.jsonc");
    useEngine(
      { protocol: 1, valid: true },
      { byConfig: rejecting({ "*": "ask", subshell: "deny" }, "the merged block is inconsistent") },
    );
    const harness = await startPlugin(project);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the bash engine rejected the merged policy from ${globalFile} and ${projectFile}: the merged block is inconsistent. Fix what it names, then restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});

describe("when the policy file cannot be read or parsed", () => {
  test("a file that cannot be parsed denies every shell call, naming the file", async () => {
    useEngine({ protocol: 1, valid: true });
    const directory = projectWithText(`{ "default": { "*": "ask", `);
    const file = join(directory, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(directory);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: PropertyNameExpected at line 1. Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a file that cannot be read denies every shell call, naming the file", async () => {
    useEngine({ protocol: 1, valid: true });
    const directory = mkdtempSync(join(sandboxRoot, "project-"));
    const file = join(directory, ".opencode", "lovely-permissions.jsonc");
    mkdirSync(file, { recursive: true });
    const harness = await startPlugin(directory);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: it could not be read: EISDIR: illegal operation on a directory, read. Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a file with no default mode denies every shell call, naming the file", async () => {
    useEngine({ protocol: 1, valid: true });
    const directory = projectWith({ build: { bash: BASH } });
    const file = join(directory, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(directory);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: it has no "default" mode. Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a mode key the policy does not allow denies every shell call, naming the file and the key", async () => {
    useEngine({ protocol: 1, valid: true });
    const project = projectWith({ default: { bash: BASH, bahs: { "*": "deny" } } });
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: unknown key 'bahs' in the "default" mode; valid keys are 'bash', '*'. Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a mode whose * is not allow, ask, or deny denies every shell call, naming the file and the level", async () => {
    useEngine({ protocol: 1, valid: true });
    const project = projectWith({ default: { "*": "alow", bash: BASH } });
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the policy file ${file} could not be used: the "*" of the "default" mode should be 'allow', 'ask' or 'deny' (got 'alow'). Fix the file and restart OpenCode.`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});

describe("when the engine gives no answer", () => {
  test("a shell call is denied, naming the failure and the fix", async () => {
    useEngine("engine: unexpected output\n");
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        "- the bash engine did not start or answer: it did not answer with one JSON object. Reinstall it with `uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to a working engine binary, then restart OpenCode.",
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});

function unrunnableEngine(): string {
  const dir = mkdtempSync(join(sandboxRoot, "engine-"));
  const path = join(dir, "lovely-pi-bash-permissions");
  writeFileSync(path, "", { mode: 0o644 });
  return path;
}

describe("when the engine exits on start", () => {
  const DENIAL = [
    "[♡ perms: ❤️ auto-rejected]",
    "- the bash engine did not start or answer: it exited with code 1 before answering. Reinstall it with `uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to a working engine binary, then restart OpenCode.",
    "The tool has not been run.",
  ].join("\n");

  test("every shell call is denied, naming the failure and the fix", async () => {
    process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = crashingEngine(1).path;
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: DENIAL });
    expect(
      await harness.evaluate({ action: "shell", resources: ["rm -rf /"], effect: "ask" }),
    ).toEqual({ effect: "deny", message: DENIAL });
    expect(
      await harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).toEqual({ effect: "allow", message: undefined });
  });

  test("a shell call whose command was captured is denied too, for the rest of the session", async () => {
    process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = crashingEngine(1).path;
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    await harness.startCall({
      tool: "shell",
      id: "call_failed",
      input: { command: "git status" },
    });
    expect(
      await harness.evaluate({
        action: "shell",
        resources: ["git status"],
        effect: "allow",
        source: { type: "tool", messageID: "msg_test", id: "call_failed" },
      }),
    ).toEqual({ effect: "deny", message: DENIAL });
  });

  test("with no policy file, every shell call is still denied", async () => {
    process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = crashingEngine(1).path;
    const harness = await startPlugin();
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: DENIAL });
  });
});

describe("when the engine cannot be started", () => {
  test("every shell call is denied, naming the failure and the fix", async () => {
    const path = unrunnableEngine();
    process.env.LOVELY_PI_BASH_PERMISSIONS_BIN = path;
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    const decision = await harness.evaluate({
      action: "shell",
      resources: ["git status"],
      effect: "allow",
    });

    // Bun and Node format spawn errors differently; the verdict and diagnostic context stay stable.
    expect(decision.effect).toBe("deny");
    expect(decision.message).toContain("[♡ perms: ❤️ auto-rejected]");
    expect(decision.message).toContain(
      "the bash engine did not start or answer: it could not be started:",
    );
    expect(decision.message).toContain(path);
    expect(decision.message).toContain("EACCES");
    expect(decision.message).toContain(
      "Reinstall it with `uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions`",
    );
    expect(decision.message?.endsWith("The tool has not been run.")).toBe(true);
  });
});

describe("when the engine speaks another protocol version", () => {
  const FIX =
    "Install an engine that speaks protocol 1 with `uv tool install --force git+https://github.com/justfortheloveof/lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to one, or update this plugin to a version that matches the engine, then restart OpenCode.";

  test("every shell call is denied with the protocol message, naming the fix", async () => {
    useEngine({ protocol: 2, valid: true });
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    const denial = [
      "[♡ perms: ❤️ auto-rejected]",
      `- the bash engine answered with protocol 2, but this plugin needs protocol 1. ${FIX}`,
      "The tool has not been run.",
    ].join("\n");
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({ effect: "deny", message: denial });
    expect(
      await harness.evaluate({ action: "shell", resources: ["rm -rf /"], effect: "ask" }),
    ).toEqual({ effect: "deny", message: denial });
    expect(
      await harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).toEqual({ effect: "allow", message: undefined });
  });

  test("an answer with no protocol version is a mismatch too", async () => {
    useEngine({ valid: true });
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    expect(
      await harness.evaluate({ action: "shell", resources: ["git status"], effect: "allow" }),
    ).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the bash engine answered with no protocol version, but this plugin needs protocol 1. ${FIX}`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });

  test("a mismatch seen during a command denies that command, and every later shell call, with the protocol message", async () => {
    const engine = useEngine(ALLOWED, { byCommand: { "rm -rf /": { protocol: 2, valid: true } } });
    const harness = await startPlugin(projectWith({ default: { bash: BASH } }));
    const denial = [
      "[♡ perms: ❤️ auto-rejected]",
      `- the bash engine answered with protocol 2, but this plugin needs protocol 1. ${FIX}`,
      "The tool has not been run.",
    ].join("\n");
    expect(await judge(harness, "call_mismatch", "rm -rf /", "allow")).toEqual({
      effect: "deny",
      message: denial,
    });
    expect(await judge(harness, "call_after_mismatch", "git status", "ask")).toEqual({
      effect: "deny",
      message: denial,
    });
    expect(
      await harness.evaluate({ action: "read", resources: ["/etc/hosts"], effect: "allow" }),
    ).toEqual({ effect: "allow", message: undefined });
    expect(evaluations(engine).map((request) => request.command)).toEqual(["rm -rf /"]);
  });

  test("a mismatch seen during a command is not an engine error, so an error level of allow does not allow it", async () => {
    useEngine(ALLOWED, { byCommand: { "rm -rf /": { protocol: 2, valid: true } } });
    const harness = await startPlugin(
      projectWith({ default: { "*": "allow", bash: { "*": "allow", error: "allow" } } }),
    );
    expect(await judge(harness, "call_mismatch_error_level", "rm -rf /", "allow")).toEqual({
      effect: "deny",
      message: [
        "[♡ perms: ❤️ auto-rejected]",
        `- the bash engine answered with protocol 2, but this plugin needs protocol 1. ${FIX}`,
        "The tool has not been run.",
      ].join("\n"),
    });
  });
});
