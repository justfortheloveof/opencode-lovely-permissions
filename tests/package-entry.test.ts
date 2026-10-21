import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";
import { Host } from "@opencode/plugin/host";
import tuiPlugin from "opencode-lovely-bash-permissions/tui";
import rootEntry from "../index.ts";
import plugin from "../src/index.ts";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const packageDirectory = fileURLToPath(new URL("../", import.meta.url));

describe("package entry", () => {
  test("the package root loads the plugin, so a path to the package directory loads it", () => {
    expect(rootEntry).toBe(plugin);
  });

  test("the root entry is shipped in the package", () => {
    expect(manifest.files).toContain("index.ts");
  });

  test("the terminal entry is exported and shipped in the package", () => {
    expect(manifest.exports["./tui"]).toBe("./src/tui.ts");
    expect(manifest.files).toContain("src");
    expect(tuiPlugin.id).toBe("lovely-bash-permissions");
  });

  test("a local package directory resolves its terminal entry through the host", () => {
    const entries = Host.resolve({ directory: packageDirectory });

    expect(entries.tui).toBe(new URL("../tui.ts", import.meta.url).href);
    expect(manifest.files).toContain("tui.ts");
    expect(manifest.exports["./tui"]).toBe("./src/tui.ts");
  });

  test("terminal rendering dependencies are optional peers", () => {
    expect(manifest.peerDependencies).toEqual({
      "@opentui/core": ">=0.5.17",
      "@opentui/solid": ">=0.5.17",
      "solid-js": ">=1.9.0",
    });
    expect(manifest.peerDependenciesMeta).toEqual({
      "@opentui/core": { optional: true },
      "@opentui/solid": { optional: true },
      "solid-js": { optional: true },
    });
  });
});
