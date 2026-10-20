import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { EngineError, evaluate, validate, type EvaluateRequest } from "../src/engine-client.ts";
import { sandboxRoot } from "./support/sandbox.ts";
import { stubEngine } from "./support/stub-engine.ts";

const ALLOW = {
  protocol: 1,
  action: "allow",
  reason: "command matches allowed pattern: ^git\\s+status$",
  reasons: ["command matches allowed pattern: ^git\\s+status$"],
};

const BASH = {
  "*": "ask",
  allowed_cmds_regex: ["^git\\s+status$"],
  blocked_cmds_regex: ["/etc/passwd"],
};

describe("evaluate", () => {
  test("sends the whole command line, the bash block, and the top-level wildcard", async () => {
    const engine = stubEngine(ALLOW);
    const command = "echo hi | cat > out.txt && git status";
    await evaluate(engine.path, { command, bash: BASH, topLevel: "allow" });
    expect(engine.requests()).toEqual([
      { op: "evaluate", command, config: BASH, top_level: "allow" },
    ]);
  });

  test("returns the action and reasons as the engine sent them", async () => {
    const engine = stubEngine({
      protocol: 1,
      action: "ask",
      reason: "first reason; second reason",
      reasons: ["first reason", "second reason"],
    });
    await expect(
      evaluate(engine.path, { command: "rm -rf /", bash: BASH, topLevel: "ask" }),
    ).resolves.toEqual({
      action: "ask",
      reasons: ["first reason", "second reason"],
    });
  });

  test.each([
    ["two", { protocol: 2, action: "allow", reason: "", reasons: [] }],
    ["absent", { action: "allow", reason: "", reasons: [] }],
  ])(
    "rejects a response whose protocol is not 1 (%s), rather than returning a verdict",
    async (_, response) => {
      const engine = stubEngine(response);
      await expect(
        evaluate(engine.path, { command: "git status", bash: BASH, topLevel: "ask" }),
      ).rejects.toThrow(/protocol/);
    },
  );

  test("rejects an error answer with no action, carrying the engine's message", async () => {
    const engine = stubEngine({
      protocol: 1,
      valid: false,
      error: "internal error: KeyError: 'op'",
    });
    await expect(
      evaluate(engine.path, { command: "git status", bash: BASH, topLevel: "ask" }),
    ).rejects.toThrow("internal error: KeyError: 'op'");
  });

  test("starts the engine once per call", async () => {
    const engine = stubEngine(ALLOW);
    const request: EvaluateRequest = { command: "git status", bash: BASH, topLevel: "ask" };
    await evaluate(engine.path, request);
    await evaluate(engine.path, request);
    expect(engine.requests()).toHaveLength(2);
  });

  test.each(["engine: unexpected output\n", "null\n"])(
    "rejects when the engine does not answer with one JSON object (%j)",
    async (output) => {
      const engine = stubEngine(output);
      await expect(
        evaluate(engine.path, { command: "git status", bash: BASH, topLevel: "ask" }),
      ).rejects.toThrow("did not answer with one JSON object");
    },
  );

  test("rejects when the engine cannot be started", async () => {
    const missing = join(sandboxRoot, "missing", "lovely-pi-bash-permissions");
    await expect(
      evaluate(missing, { command: "git status", bash: BASH, topLevel: "ask" }),
    ).rejects.toThrow(EngineError);
  });
});

describe("validate", () => {
  test("sends the bash block as a validate request", async () => {
    const engine = stubEngine({ protocol: 1, valid: true });
    await validate(engine.path, BASH);
    expect(engine.requests()).toEqual([{ op: "validate", config: BASH }]);
  });

  test("resolves valid when the engine accepts the block", async () => {
    const engine = stubEngine({ protocol: 1, valid: true });
    await expect(validate(engine.path, BASH)).resolves.toEqual({ valid: true });
  });

  test("returns the engine's message when it rejects the block", async () => {
    const engine = stubEngine({
      protocol: 1,
      valid: false,
      error: "*: Input should be 'allow', 'deny' or 'ask' (got 'alow')",
    });
    await expect(validate(engine.path, { "*": "alow" })).resolves.toEqual({
      valid: false,
      error: "*: Input should be 'allow', 'deny' or 'ask' (got 'alow')",
    });
  });

  test("rejects a response whose protocol is not 1, rather than returning a result", async () => {
    const engine = stubEngine({ protocol: 2, valid: true });
    await expect(validate(engine.path, BASH)).rejects.toThrow(/protocol/);
  });

  test("rejects an answer with no validation result", async () => {
    const engine = stubEngine({ protocol: 1 });
    await expect(validate(engine.path, BASH)).rejects.toThrow(EngineError);
  });
});
