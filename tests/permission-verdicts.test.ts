import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";
import { judge, startPlugin, type PermissionDecision } from "./support/fake-context.ts";
import { restoreEnvAfterEach } from "./support/env.ts";
import { projectWith } from "./support/project.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import { evaluations, NEVER_ANSWERS, useEngine } from "./support/stub-engine.ts";

const ALLOW_REASONS = ["command matches allowed pattern: ^git\\s+status$"];
const ASK_REASONS = ["the command matches no allowed pattern", "it writes to a file"];
const DENY_REASONS = ["the command matches a blocked pattern", "it reads /etc/passwd"];
const VALID_POLICY = { default: { bash: {} } };

function verdict(action: string, reasons: string[]) {
  return { protocol: 1, valid: true, action, reason: reasons.join("; "), reasons };
}

describe("allow", () => {
  test("an allow verdict sets the allow effect and no message", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_allow", "git status", "allow")).toEqual({
      effect: "allow",
      message: undefined,
    });
  });

  test("an allow verdict replaces OpenCode's ask", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_allow_over_ask", "git status", "ask")).toEqual({
      effect: "allow",
      message: undefined,
    });
  });
});

describe("ask", () => {
  test("an ask verdict sets the ask effect, the ask label, and one bullet per reason in the engine's order", async () => {
    useEngine(verdict("ask", ASK_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_ask", "cat notes > out.txt", "allow")).toEqual({
      effect: "ask",
      message:
        "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern\n- it writes to a file",
    });
  });
});

describe("deny", () => {
  test("a deny verdict sets the deny effect, the deny label, one bullet per reason, and the closing sentence", async () => {
    useEngine(verdict("deny", DENY_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_deny", "cat /etc/passwd", "allow")).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command matches a blocked pattern\n- it reads /etc/passwd\nThe tool has not been run.",
    });
  });

  test("a deny verdict replaces OpenCode's ask", async () => {
    useEngine(verdict("deny", DENY_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_deny_over_ask", "cat /etc/passwd", "ask")).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command matches a blocked pattern\n- it reads /etc/passwd\nThe tool has not been run.",
    });
  });

  test("a reason that already ends with the closing sentence shows that sentence once, at the end", async () => {
    const blocked =
      'Blocked by bash permissions: Argument "/etc/passwd" matches blocked pattern /etc/. The tool has not been run';
    useEngine(verdict("deny", [blocked, "it reads /etc/passwd"]));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_deny_engine_sentence", "cat /etc/passwd", "allow")).toEqual({
      effect: "deny",
      message:
        '[♡ perms: ❤️ auto-rejected]\n- Blocked by bash permissions: Argument "/etc/passwd" matches blocked pattern /etc/.\n- it reads /etc/passwd\nThe tool has not been run.',
    });
  });

  test("an action that is not a level is applied as a deny", async () => {
    useEngine(verdict("maybe", ASK_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_unknown_action", "git status", "allow")).toEqual({
      effect: "deny",
      message:
        "[♡ perms: ❤️ auto-rejected]\n- the command matches no allowed pattern\n- it writes to a file\nThe tool has not been run.",
    });
  });
});

describe("OpenCode's explicit deny", () => {
  test("is not replaced by an allow verdict", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
    expect(await judge(harness, "call_explicit_deny", "git status", "deny")).toEqual({
      effect: "deny",
      message: undefined,
    });
  });
});

describe("the engine request", () => {
  test("gets the whole command line as captured, with the bash block and the mode's wildcard unchanged", async () => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS));
    const bash = {
      "*": "deny",
      allowed_cmds_regex: ["^git\\s+status$"],
      output_redirection: { "*": "ask", stdout_to_dev_null: "allow" },
    };
    const harness = await startPlugin(projectWith({ default: { "*": "allow", bash } }));
    const command = "echo hi | cat > out.txt && git status ";
    await judge(harness, "call_request", command, "ask");
    expect(engine.requests()).toEqual([
      { op: "validate", config: bash },
      { op: "validate", config: bash },
      { op: "evaluate", command, config: bash, top_level: "allow" },
    ]);
  });

  test.each([
    ["has no * of its own", {}, "ask"],
    ["sets * to deny", { "*": "deny" }, "deny"],
  ])(
    "sends the mode's * as the top level when it has one, and ask otherwise: a mode that %s",
    async (_, wildcard, topLevel) => {
      const engine = useEngine(verdict("allow", ALLOW_REASONS));
      const bash = { allowed_cmds_regex: ["^git\\s+status$"] };
      const harness = await startPlugin(projectWith({ default: { ...wildcard, bash } }));
      await judge(harness, "call_top_level", "git status", "ask");
      expect(evaluations(engine)).toEqual([
        { op: "evaluate", command: "git status", config: bash, top_level: topLevel },
      ]);
    },
  );

  test("with no policy file, setup checks the engine with an empty bash block, and a shell call is not sent to it", async () => {
    const engine = useEngine(verdict("ask", ASK_REASONS));
    const harness = await startPlugin();
    await judge(harness, "call_no_policy", "git status", "allow");
    expect(engine.requests()).toEqual([{ op: "validate", config: {} }]);
  });
});

describe("temporary Mode selection", () => {
  test("reports the distinct loaded Modes and the configured active Mode", async () => {
    useEngine({ protocol: 1, valid: true });
    const globalDirectory = mkdtempSync(join(sandboxRoot, "mode-config-"));
    process.env.OPENCODE_CONFIG_DIR = globalDirectory;
    writeFileSync(
      join(globalDirectory, "lovely-permissions.jsonc"),
      JSON.stringify({ default: {}, personal: {} }),
    );
    const project = projectWith({ default: {}, strict: { bash: { "*": "deny" } } });
    writeFileSync(
      join(project, ".opencode", "lovely-permissions.local.jsonc"),
      JSON.stringify({ default: {}, strict: {}, local: {} }),
    );
    const harness = await startPlugin(project, { mode: "strict" });

    expect(await harness.modeList()).toEqual({
      status: "ready",
      modes: ["default", "personal", "strict", "local"],
      activeMode: "strict",
    });
  });

  test("keeps overrides in memory and reloads the configured Mode or default", async () => {
    useEngine({ protocol: 1, valid: true });
    const project = projectWith({ default: {}, strict: { bash: { "*": "deny" } } });
    const harness = await startPlugin(project, { mode: "strict" });

    expect(await harness.setMode("default")).toEqual({ status: "changed", activeMode: "default" });
    expect(await harness.setMode("default")).toEqual({
      status: "unchanged",
      activeMode: "default",
    });

    const reloaded = await startPlugin(project, { mode: "strict" });
    const defaulted = await startPlugin(project);
    expect(await reloaded.modeList()).toMatchObject({ status: "ready", activeMode: "strict" });
    expect(await defaulted.modeList()).toMatchObject({ status: "ready", activeMode: "default" });
  });

  test("applies a validated Mode to later permission evaluations", async () => {
    const strictBash = { blocked_cmds_regex: ["^rm\\s+-rf$"] };
    const engine = useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(
      projectWith({
        default: { bash: { allowed_cmds_regex: ["^git\\s+status$"] } },
        strict: { bash: strictBash },
      }),
    );

    expect(await harness.setMode("strict")).toEqual({
      status: "changed",
      activeMode: "strict",
    });
    await judge(harness, "call_after_mode_change", "git status");

    expect(evaluations(engine)).toEqual([
      { op: "evaluate", command: "git status", config: strictBash, top_level: "ask" },
    ]);
  });

  test("keeps the Policy captured by a permission evaluation already in progress", async () => {
    const defaultBash = { error: "ask" };
    const engine = useEngine(verdict("allow", ALLOW_REASONS), {
      byCommand: { "sleep 100": NEVER_ANSWERS },
    });
    const harness = await startPlugin(
      projectWith({ default: { bash: defaultBash }, strict: { bash: { error: "deny" } } }),
    );
    await harness.startCall({
      tool: "shell",
      id: "call_in_progress",
      input: { command: "sleep 100" },
    });
    const pendingEvaluation = harness.evaluate({
      action: "shell",
      resources: ["sleep 100"],
      effect: "allow",
      source: { type: "tool", messageID: "msg_test", id: "call_in_progress" },
    });

    expect(await harness.setMode("strict")).toEqual({
      status: "changed",
      activeMode: "strict",
    });
    expect(await pendingEvaluation).toMatchObject({ effect: "ask" });
    expect(evaluations(engine)[0]).toEqual({
      op: "evaluate",
      command: "sleep 100",
      config: defaultBash,
      top_level: "ask",
    });
  }, 15_000);

  test("keeps the active Mode when the engine rejects a candidate Policy", async () => {
    const defaultBash = { allowed_cmds_regex: ["^git\\s+status$"] };
    const strictBash = { blocked_cmds_regex: ["^rm\\s+-rf$"] };
    useEngine(verdict("allow", ALLOW_REASONS), {
      byConfig: {
        [JSON.stringify(strictBash)]: {
          protocol: 1,
          valid: false,
          error: "invalid strict bash block",
        },
      },
    });
    const harness = await startPlugin(
      projectWith({ default: { bash: defaultBash }, strict: { bash: strictBash } }),
    );

    expect(await harness.setMode("strict")).toEqual({
      status: "invalid-policy",
      mode: "strict",
    });
    expect(await harness.modeList()).toMatchObject({ status: "ready", activeMode: "default" });
  });

  test("does not treat an engine validation failure as an invalid candidate Policy", async () => {
    const strictBash = { blocked_cmds_regex: ["^rm\\s+-rf$"] };
    useEngine(verdict("allow", ALLOW_REASONS), {
      byConfig: { [JSON.stringify(strictBash)]: { protocol: 1, valid: false } },
    });
    const harness = await startPlugin(projectWith({ default: {}, strict: { bash: strictBash } }));

    expect(await harness.setMode("strict")).toEqual({ status: "engine-failed" });
    expect(await harness.modeList()).toMatchObject({ status: "ready", activeMode: "default" });
  });

  test("preserves OpenCode's explicit deny after switching Modes", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(
      projectWith({ default: {}, strict: { bash: { "*": "deny" } } }),
    );
    await harness.setMode("strict");

    expect(await judge(harness, "call_explicit_deny_after_switch", "git status", "deny")).toEqual({
      effect: "deny",
      message: undefined,
    });
  });
});

describe("an invalid policy file", () => {
  test("denies every shell call, naming the file, without asking the engine", async () => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS));
    const project = projectWith({ strict: { "*": "allow" } });
    const file = join(project, ".opencode", "lovely-permissions.jsonc");
    const harness = await startPlugin(project);
    expect(await judge(harness, "call_invalid_policy", "git status", "allow")).toEqual({
      effect: "deny",
      message: `[♡ perms: ❤️ auto-rejected]\n- the policy file ${file} could not be used: it has no "default" mode. Fix the file and restart OpenCode.\nThe tool has not been run.`,
    });
    expect(engine.requests()).toEqual([]);
  });
});

describe("with no policy file", () => {
  restoreEnvAfterEach(["HOME", "XDG_CONFIG_HOME", "OPENCODE_CONFIG_DIR"]);

  let project: string;
  let expected: string;

  beforeEach(() => {
    const root = mkdtempSync(join(sandboxRoot, "no-policy-"));
    const globalDir = join(root, "global");
    project = join(root, "project");
    mkdirSync(project);
    process.env.HOME = join(root, "home");
    process.env.XDG_CONFIG_HOME = join(root, "xdg");
    process.env.OPENCODE_CONFIG_DIR = globalDir;
    expected = [
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
      `- no global policy file at ${join(globalDir, "lovely-permissions.jsonc")}`,
      `- no project policy file at ${join(project, ".opencode", "lovely-permissions.jsonc")}`,
      `- no local policy file at ${join(project, ".opencode", "lovely-permissions.local.jsonc")}`,
    ].join("\n");
  });

  test("every shell call asks, naming the three expected locations, whatever OpenCode's effect", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(project);
    expect(await judge(harness, "call_no_policy_allow", "git status", "allow")).toEqual({
      effect: "ask",
      message: expected,
    });
    expect(await judge(harness, "call_no_policy_ask", "rm -rf /", "ask")).toEqual({
      effect: "ask",
      message: expected,
    });
  });

  test("the engine is not asked for a verdict", async () => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(project);
    await judge(harness, "call_no_policy_engine", "git status", "allow");
    expect(evaluations(engine)).toEqual([]);
  });

  test("OpenCode's explicit deny still stands", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(project);
    expect(await judge(harness, "call_no_policy_deny", "git status", "deny")).toEqual({
      effect: "deny",
      message: undefined,
    });
  });

  test("a shell call with no captured command still asks", async () => {
    useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(project);
    expect(
      await harness.evaluate({
        action: "shell",
        resources: ["git status"],
        effect: "allow",
        source: { type: "tool", messageID: "msg_test", id: "call_never_started" },
      }),
    ).toEqual({ effect: "ask", message: expected });
  });
});

describe("a shell call with no captured command", () => {
  test("is denied as unmatched, without asking the engine for a verdict", async () => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS));
    const harness = await startPlugin(projectWith(VALID_POLICY));
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
    expect(engine.requests()).toEqual([
      { op: "validate", config: {} },
      { op: "validate", config: {} },
    ]);
  });
});

describe("an engine error for one command", () => {
  const ENGINE_FAILURE = { protocol: 1, valid: false, error: "internal error: KeyError: 'op'" };
  const ASKED = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- internal error: KeyError: 'op'";
  const DENIED =
    "[♡ perms: ❤️ auto-rejected]\n- internal error: KeyError: 'op'\nThe tool has not been run.";

  const cases: [string, Record<string, unknown>, PermissionDecision][] = [
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
  ];

  test.each(cases)("%s", async (_, mode, expected) => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS), {
      byCommand: { "rm -rf /": ENGINE_FAILURE },
    });
    const harness = await startPlugin(projectWith({ default: mode }));
    expect(await judge(harness, "call_engine_error", "rm -rf /", "allow")).toEqual(expected);
    expect(evaluations(engine)).toHaveLength(1);
  });

  test("a parse failure the engine answers as a verdict is applied as the engine gave it", async () => {
    const reason =
      "error evaluating command (policy 'deny'): Failed to parse: 1:4: `((` can only be used to open an arithmetic cmd";
    useEngine(verdict("deny", [reason]));
    const harness = await startPlugin(
      projectWith({ default: { "*": "ask", bash: { error: "deny" } } }),
    );
    expect(await judge(harness, "call_parse_failure", "((", "allow")).toEqual({
      effect: "deny",
      message: `[♡ perms: ❤️ auto-rejected]\n- ${reason}\nThe tool has not been run.`,
    });
  });

  test("the next command after the failure is evaluated normally", async () => {
    const engine = useEngine(verdict("allow", ALLOW_REASONS), {
      byCommand: { "rm -rf /": ENGINE_FAILURE },
    });
    const harness = await startPlugin(
      projectWith({ default: { "*": "ask", bash: { error: "deny" } } }),
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
    const engine = useEngine(verdict("allow", ALLOW_REASONS), {
      byCommand: { "sleep 100": NEVER_ANSWERS },
    });
    const harness = await startPlugin(
      projectWith({ default: { "*": "allow", bash: { "*": "allow", error: "deny" } } }),
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
    useEngine(verdict("allow", ALLOW_REASONS), { byCommand: { "sleep 100": NEVER_ANSWERS } });
    const harness = await startPlugin(
      projectWith({ default: { "*": "ask", bash: { error: "deny" } } }),
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
