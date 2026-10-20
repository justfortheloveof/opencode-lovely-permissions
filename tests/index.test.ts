import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";
import { startPlugin } from "./support/fake-context.ts";
import { sandboxRoot } from "./support/sandbox.ts";

const NOT_FOUND_DENIAL = [
  "[♡ perms: ❤️ auto-rejected]",
  "- lovely-pi-bash-permissions was not found. Install it with `uv tool install lovely-bash-permissions`, or set LOVELY_PI_BASH_PERMISSIONS_BIN to the path of an existing engine binary.",
  "The tool has not been run.",
].join("\n");

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
