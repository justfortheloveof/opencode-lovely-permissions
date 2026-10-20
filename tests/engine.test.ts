import { dirname, join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { resolveEngine } from "../src/engine.ts";
import { emptyPathDir, sandboxRoot } from "./support/sandbox.ts";
import { stubEngine } from "./support/stub-engine.ts";

const RESPONSE = { protocol: 1, action: "allow", reason: "", reasons: [] };

describe("resolveEngine", () => {
  test("prefers the override to PATH when both exist", () => {
    const onPath = stubEngine(RESPONSE);
    const override = stubEngine(RESPONSE);
    const resolved = resolveEngine({
      PATH: dirname(onPath.path),
      LOVELY_PI_BASH_PERMISSIONS_BIN: override.path,
    });
    expect(resolved).toBe(override.path);
  });

  test("falls back to PATH when the override names a missing file", () => {
    const onPath = stubEngine(RESPONSE);
    const resolved = resolveEngine({
      PATH: dirname(onPath.path),
      LOVELY_PI_BASH_PERMISSIONS_BIN: join(sandboxRoot, "missing", "lovely-pi-bash-permissions"),
    });
    expect(resolved).toBe(onPath.path);
  });

  test("falls back to PATH when the override names a directory", () => {
    const onPath = stubEngine(RESPONSE);
    const resolved = resolveEngine({
      PATH: dirname(onPath.path),
      LOVELY_PI_BASH_PERMISSIONS_BIN: sandboxRoot,
    });
    expect(resolved).toBe(onPath.path);
  });

  test("finds the engine on PATH when no override is set", () => {
    const onPath = stubEngine(RESPONSE);
    expect(resolveEngine({ PATH: [emptyPathDir, dirname(onPath.path)].join(":") })).toBe(
      onPath.path,
    );
  });

  test("is undefined when neither the override nor PATH has an engine", () => {
    const resolved = resolveEngine({
      PATH: emptyPathDir,
      LOVELY_PI_BASH_PERMISSIONS_BIN: join(sandboxRoot, "missing", "lovely-pi-bash-permissions"),
    });
    expect(resolved).toBeUndefined();
  });
});
