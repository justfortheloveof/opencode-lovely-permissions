import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { Host } from "@opencode/plugin/host";
// @ts-expect-error The generated package entry is JavaScript without declarations.
import tuiPlugin from "opencode-lovely-permissions/tui";
import rootEntry from "../index.ts";
import plugin from "../src/index.ts";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const packageDirectory = fileURLToPath(new URL("../", import.meta.url));
const artifactPath = new URL("../dist/tui.js", import.meta.url);
const tuiShim = readFileSync(new URL("../tui.ts", import.meta.url), "utf-8").trim();

describe("package entry", () => {
  test("the package root loads the plugin, so a path to the package directory loads it", () => {
    expect(rootEntry).toBe(plugin);
  });

  test("the root entry is shipped in the package", () => {
    expect(manifest.files).toContain("index.ts");
  });

  test("the terminal entry is exported and shipped in the package", () => {
    expect(manifest.exports["./tui"]).toBe("./dist/tui.js");
    expect(manifest.files).toContain("dist");
    expect(manifest.scripts.prepack).toBe("bun run build");
    expect(existsSync(artifactPath)).toBe(true);
    expect(tuiPlugin.id).toBe("lovely-permissions");
  });

  test("a local package directory resolves its terminal entry through the host", () => {
    const entries = Host.resolve({ directory: packageDirectory });

    expect(entries.tui).toBe(new URL("../tui.ts", import.meta.url).href);
    expect(manifest.files).toContain("tui.ts");
    expect(tuiShim).toContain('export { default } from "./dist/tui.js";');
    expect(manifest.exports["./tui"]).toBe("./dist/tui.js");
  });

  test("the compiled terminal entry leaves host runtime imports external", () => {
    const artifact = readFileSync(artifactPath, "utf-8");

    expect(artifact).toContain('from "@opencode/plugin/tui"');
    expect(artifact).toContain('from "@opentui/solid"');
    expect(artifact).toContain('from "solid-js"');
    expect(artifact).not.toContain("<text>");
    expect(artifact).not.toContain("@opentui/solid/jsx-runtime");
    expect(artifact).not.toContain("react");
  });

  test("the server package entry remains source-based", () => {
    expect(manifest.exports["."]).toBe("./src/index.ts");
    expect(manifest.files).toContain("src");
  });

  test("terminal rendering dependencies are optional peers", () => {
    expect(manifest.peerDependencies).toEqual({
      "@opentui/core": ">=0.6.6",
      "@opentui/solid": ">=0.6.6",
      "solid-js": ">=1.9.0",
    });
    expect(manifest.peerDependenciesMeta).toEqual({
      "@opentui/core": { optional: true },
      "@opentui/solid": { optional: true },
      "solid-js": { optional: true },
    });
  });

  test("targets the current OpenCode and terminal rendering dependencies", () => {
    expect(manifest.dependencies["@opencode/plugin"]).toBe("2.1.1");
    expect(manifest.devDependencies["@opentui/core"]).toBe("0.6.6");
    expect(manifest.devDependencies["@opentui/solid"]).toBe("0.6.6");
    expect(manifest.devDependencies["solid-js"]).toBe("1.9.15");
  });
});
