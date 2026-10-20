import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import rootEntry from "../index.ts";
import plugin from "../src/index.ts";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

describe("package entry", () => {
  test("the package root loads the plugin, so a path to the package directory loads it", () => {
    expect(rootEntry).toBe(plugin);
  });

  test("the root entry is shipped in the package", () => {
    expect(manifest.files).toContain("index.ts");
  });
});
