import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { selectMode } from "../src/mode.ts";
import { restoreEnvAfterEach } from "./support/env.ts";
import { readLayeredPolicy } from "./support/project.ts";

restoreEnvAfterEach(["HOME", "XDG_CONFIG_HOME", "OPENCODE_CONFIG_DIR"]);

let root: string;
let globalFile: string;
let project: string;
let projectFile: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lovely-mode-"));
  globalFile = join(root, "global", "lovely-permissions.jsonc");
  project = join(root, "project");
  projectFile = join(project, ".opencode", "lovely-permissions.jsonc");

  process.env.HOME = join(root, "home");
  process.env.XDG_CONFIG_HOME = join(root, "xdg");
  process.env.OPENCODE_CONFIG_DIR = join(root, "global");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeAt(file: string, content: string) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

test("the default mode's bash block and wildcard are selected by name", async () => {
  await writeAt(
    projectFile,
    JSON.stringify({
      default: { "*": "ask", bash: { "*": "deny", allowed_cmds_regex: ["^git\\s+status$"] } },
      strict: { "*": "deny", bash: { "*": "deny" } },
    }),
  );

  expect(selectMode(await readLayeredPolicy(project), "default")).toEqual({
    status: "valid",
    mode: "default",
    policy: {
      bash: { "*": "deny", allowed_cmds_regex: ["^git\\s+status$"] },
      wildcard: "ask",
    },
  });
});

test("a named mode that exists selects that mode's bash block and wildcard", async () => {
  await writeAt(
    projectFile,
    JSON.stringify({
      default: { "*": "ask", bash: { "*": "ask" } },
      strict: { "*": "deny", bash: { "*": "deny", subshell: "allow" } },
    }),
  );

  expect(selectMode(await readLayeredPolicy(project), "strict")).toEqual({
    status: "valid",
    mode: "strict",
    policy: { bash: { "*": "deny", subshell: "allow" }, wildcard: "deny" },
  });
});

test("a mode defined only in the global file can be selected", async () => {
  await writeAt(globalFile, JSON.stringify({ default: {}, personal: { "*": "allow" } }));
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));

  expect(selectMode(await readLayeredPolicy(project), "personal")).toEqual({
    status: "valid",
    mode: "personal",
    policy: { bash: {}, wildcard: "allow" },
  });
});

test("a selected mode that does not exist is invalid, naming the mode and listing the modes that exist", async () => {
  await writeAt(
    projectFile,
    JSON.stringify({ default: { "*": "ask" }, personal: { "*": "allow" } }),
  );

  expect(selectMode(await readLayeredPolicy(project), "strict")).toEqual({
    status: "unknown-mode",
    mode: "strict",
    reason:
      'the mode option selects "strict", but no policy file defines that mode. The modes that exist are: "default", "personal". Set the mode option to one of them, then restart OpenCode.',
  });
});

test("a mode name that only exists as an Object property is not a mode", async () => {
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));

  expect(selectMode(await readLayeredPolicy(project), "constructor")).toMatchObject({
    status: "unknown-mode",
    mode: "constructor",
  });
});

test("a file with no default mode is invalid, and the file is named", async () => {
  await writeAt(projectFile, JSON.stringify({ strict: { "*": "deny" } }));

  expect(selectMode(await readLayeredPolicy(project), "default")).toMatchObject({
    status: "invalid",
    file: projectFile,
  });
});

test("no policy file is absent", async () => {
  expect(selectMode(await readLayeredPolicy(project), "default")).toEqual({ status: "absent" });
});
