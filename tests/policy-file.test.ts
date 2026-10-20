import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";
import { readProjectPolicy } from "../src/policy-file.ts";

let project: string;
let policyFile: string;

beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), "lovely-policy-"));
  policyFile = join(project, ".opencode", "lovely-permissions.jsonc");
});

afterEach(async () => {
  await rm(project, { recursive: true, force: true });
});

async function writePolicy(content: string) {
  await mkdir(join(project, ".opencode"), { recursive: true });
  await writeFile(policyFile, content);
}

test("a file with comments and trailing commas is read", async () => {
  await writePolicy(`// Team rules for this repository
{
  /* the mode every session uses */
  "default": {
    "*": "ask",
    "bash": {
      "*": "ask",
      "allowed_cmds_regex": [
        "^git\\\\s+status$", // read-only
        "^ls\\\\b",
      ],
    },
  },
}
`);

  expect(await readProjectPolicy(project)).toEqual({
    status: "valid",
    file: policyFile,
    bash: { "*": "ask", allowed_cmds_regex: ["^git\\s+status$", "^ls\\b"] },
    wildcard: "ask",
  });
});

test("the bash block and the top-level wildcard are returned unchanged", async () => {
  await writePolicy(
    JSON.stringify({
      default: {
        "*": "deny",
        bash: {
          "*": "ask",
          error: "deny",
          allowed_cmds_regex: ["^git\\s+status$"],
          blocked_cmds_regex: ["/etc/passwd"],
          output_redirection: { "*": "ask", stdout_to_dev_null: "allow" },
          subshell: "deny",
        },
      },
      strict: { "*": "deny" },
    }),
  );

  const result = await readProjectPolicy(project);

  expect(result).toEqual({
    status: "valid",
    file: policyFile,
    bash: {
      "*": "ask",
      error: "deny",
      allowed_cmds_regex: ["^git\\s+status$"],
      blocked_cmds_regex: ["/etc/passwd"],
      output_redirection: { "*": "ask", stdout_to_dev_null: "allow" },
      subshell: "deny",
    },
    wildcard: "deny",
  });
});

test("a default mode without a bash block gets an empty bash block and no wildcard", async () => {
  await writePolicy(`{ "default": { } }`);

  expect(await readProjectPolicy(project)).toEqual({
    status: "valid",
    file: policyFile,
    bash: {},
    wildcard: undefined,
  });
});

test("a file with no default mode is invalid", async () => {
  await writePolicy(`{ "strict": { "*": "deny", "bash": { "*": "deny" } } }`);

  const result = await readProjectPolicy(project);

  expect(result).toMatchObject({ status: "invalid", file: policyFile });
  expect(result).toHaveProperty("reason", expect.stringContaining("default"));
});

test("a default mode that is not an object is invalid", async () => {
  await writePolicy(`{ "default": "ask" }`);

  expect(await readProjectPolicy(project)).toMatchObject({ status: "invalid", file: policyFile });
});

test("a bash block that is not an object is invalid", async () => {
  await writePolicy(`{ "default": { "bash": "deny" } }`);

  expect(await readProjectPolicy(project)).toMatchObject({ status: "invalid", file: policyFile });
});

test("a file whose top level is not an object is invalid", async () => {
  await writePolicy(`[{ "default": {} }]`);

  expect(await readProjectPolicy(project)).toMatchObject({ status: "invalid", file: policyFile });
});

test("a missing file is absent", async () => {
  expect(await readProjectPolicy(project)).toEqual({ status: "absent" });
});

test("a missing file is absent when the .opencode directory exists", async () => {
  await mkdir(join(project, ".opencode"));

  expect(await readProjectPolicy(project)).toEqual({ status: "absent" });
});

test("an unparseable file is invalid, not absent", async () => {
  await writePolicy(`{ "default": { "*": "ask", `);

  const result = await readProjectPolicy(project);

  expect(result).toMatchObject({ status: "invalid", file: policyFile });
  expect(result).toHaveProperty("reason", expect.stringContaining("line 1"));
});

test("an empty file is invalid, not absent", async () => {
  await writePolicy("  \n");

  expect(await readProjectPolicy(project)).toMatchObject({ status: "invalid", file: policyFile });
});

test("a file that cannot be read is invalid, not absent", async () => {
  await mkdir(policyFile, { recursive: true });

  expect(await readProjectPolicy(project)).toMatchObject({ status: "invalid", file: policyFile });
});
