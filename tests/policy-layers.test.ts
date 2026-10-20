import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";
import { policyLocations, readLayeredPolicy } from "../src/policy-layers.ts";

const ENV_KEYS = ["HOME", "XDG_CONFIG_HOME", "OPENCODE_CONFIG_DIR"] as const;

let root: string;
let globalDir: string;
let globalFile: string;
let xdgGlobalFile: string;
let homeGlobalFile: string;
let project: string;
let projectFile: string;
let localFile: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lovely-layers-"));
  globalDir = join(root, "global");
  globalFile = join(globalDir, "lovely-permissions.jsonc");
  xdgGlobalFile = join(root, "xdg", "opencode", "lovely-permissions.jsonc");
  homeGlobalFile = join(root, "home", ".config", "opencode", "lovely-permissions.jsonc");
  project = join(root, "project");
  projectFile = join(project, ".opencode", "lovely-permissions.jsonc");
  localFile = join(project, ".opencode", "lovely-permissions.local.jsonc");

  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.HOME = join(root, "home");
  process.env.XDG_CONFIG_HOME = join(root, "xdg");
  process.env.OPENCODE_CONFIG_DIR = globalDir;
});

afterEach(async () => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  await rm(root, { recursive: true, force: true });
});

async function writeAt(file: string, content: string) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

test("the local file overrides the project file, which overrides the global file, per mode name", async () => {
  await writeAt(
    globalFile,
    JSON.stringify({
      default: {
        "*": "deny",
        bash: { "*": "deny", subshell: "allow", input_redirection: "allow" },
      },
      strict: { bash: { "*": "deny" } },
    }),
  );
  await writeAt(
    projectFile,
    JSON.stringify({
      default: { bash: { subshell: "deny" } },
      strict: { "*": "ask" },
    }),
  );
  await writeAt(
    localFile,
    JSON.stringify({
      default: { bash: { subshell: "ask" } },
    }),
  );

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: {
      default: {
        bash: { "*": "deny", subshell: "ask", input_redirection: "allow" },
        wildcard: "deny",
      },
      strict: { bash: { "*": "deny" }, wildcard: "ask" },
    },
    warnings: [
      `the policy key default.bash.subshell in ${projectFile} overrides the value set in ${globalFile}`,
      `the policy key default.bash.subshell in ${localFile} overrides the value set in ${projectFile}`,
    ],
  });
});

test("a mode that only one file defines is kept as written", async () => {
  await writeAt(globalFile, JSON.stringify({ default: {} }));
  await writeAt(localFile, JSON.stringify({ default: {}, personal: { "*": "deny" } }));

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: {
      default: { bash: {}, wildcard: undefined },
      personal: { bash: {}, wildcard: "deny" },
    },
    warnings: [],
  });
});

test("objects merge recursively across the three files", async () => {
  await writeAt(
    globalFile,
    JSON.stringify({
      default: {
        bash: {
          output_redirection: { "*": "ask", stdout_to_dev_null: "allow" },
        },
      },
    }),
  );
  await writeAt(
    projectFile,
    JSON.stringify({
      default: {
        bash: {
          output_redirection: { stderr_to_dev_null: "allow" },
        },
      },
    }),
  );
  await writeAt(
    localFile,
    JSON.stringify({
      default: {
        bash: {
          output_redirection: { other: "deny" },
        },
      },
    }),
  );

  const result = await readLayeredPolicy(project);

  expect(result).toMatchObject({
    status: "valid",
    modes: {
      default: {
        bash: {
          output_redirection: {
            "*": "ask",
            stdout_to_dev_null: "allow",
            stderr_to_dev_null: "allow",
            other: "deny",
          },
        },
      },
    },
  });
});

test("arrays concatenate in file order across the three files", async () => {
  await writeAt(
    globalFile,
    JSON.stringify({ default: { bash: { allowed_cmds_regex: ["^git\\s+status$"] } } }),
  );
  await writeAt(
    projectFile,
    JSON.stringify({
      default: { bash: { allowed_cmds_regex: ["^ls\\b"], blocked_cmds_regex: ["/etc/passwd"] } },
    }),
  );
  await writeAt(
    localFile,
    JSON.stringify({ default: { bash: { allowed_cmds_regex: ["^pwd$"] } } }),
  );

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: {
      default: {
        bash: {
          allowed_cmds_regex: ["^git\\s+status$", "^ls\\b", "^pwd$"],
          blocked_cmds_regex: ["/etc/passwd"],
        },
        wildcard: undefined,
      },
    },
    warnings: [],
  });
});

test("a missing file is not an error, and the files that exist are merged", async () => {
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: { default: { bash: {}, wildcard: "ask" } },
    warnings: [],
  });
});

test("no policy file at all is absent", async () => {
  expect(await readLayeredPolicy(project)).toEqual({ status: "absent" });
});

test("a global file that cannot be parsed is invalid, and names the global file", async () => {
  await writeAt(globalFile, `{ "default": { "*": "ask", `);
  await writeAt(projectFile, JSON.stringify({ default: { "*": "deny" } }));

  const result = await readLayeredPolicy(project);

  expect(result).toMatchObject({ status: "invalid", file: globalFile });
  expect(result).toHaveProperty("reason", expect.stringContaining("line 1"));
});

test("a project file that cannot be read is invalid, and names the project file", async () => {
  await mkdir(projectFile, { recursive: true });

  expect(await readLayeredPolicy(project)).toMatchObject({
    status: "invalid",
    file: projectFile,
  });
});

test("a local file with no default mode is invalid, and names the local file", async () => {
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));
  await writeAt(localFile, JSON.stringify({ strict: { "*": "deny" } }));

  const result = await readLayeredPolicy(project);

  expect(result).toMatchObject({ status: "invalid", file: localFile });
  expect(result).toHaveProperty("reason", expect.stringContaining("default"));
});

test("a named mode whose bash block is not an object makes its file invalid", async () => {
  await writeAt(globalFile, JSON.stringify({ default: {}, strict: { bash: "deny" } }));

  expect(await readLayeredPolicy(project)).toMatchObject({ status: "invalid", file: globalFile });
});

test("the global file is read from OPENCODE_CONFIG_DIR when it is set", async () => {
  await writeAt(globalFile, JSON.stringify({ default: { "*": "deny" } }));
  await writeAt(xdgGlobalFile, JSON.stringify({ default: { "*": "allow" } }));

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: { default: { bash: {}, wildcard: "deny" } },
    warnings: [],
  });
});

test("the global file is read from XDG_CONFIG_HOME/opencode when OPENCODE_CONFIG_DIR is unset", async () => {
  delete process.env.OPENCODE_CONFIG_DIR;
  await writeAt(xdgGlobalFile, JSON.stringify({ default: { "*": "deny" } }));

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: { default: { bash: {}, wildcard: "deny" } },
    warnings: [],
  });
});

test("the global file is read from HOME/.config/opencode when neither variable is set", async () => {
  delete process.env.OPENCODE_CONFIG_DIR;
  delete process.env.XDG_CONFIG_HOME;
  await writeAt(homeGlobalFile, JSON.stringify({ default: { "*": "deny" } }));

  expect(await readLayeredPolicy(project)).toEqual({
    status: "valid",
    modes: { default: { bash: {}, wildcard: "deny" } },
    warnings: [],
  });
});

test("a scalar that a later file overrides is warned about, naming the dotted key and both files", async () => {
  await writeAt(globalFile, JSON.stringify({ default: { bash: { subshell: "allow" } } }));
  await writeAt(projectFile, JSON.stringify({ default: { bash: { subshell: "deny" } } }));

  expect(await readLayeredPolicy(project)).toMatchObject({
    status: "valid",
    warnings: [
      `the policy key default.bash.subshell in ${projectFile} overrides the value set in ${globalFile}`,
    ],
  });
});

test("a wildcard that a later file overrides is named by its mode and *", async () => {
  await writeAt(globalFile, JSON.stringify({ default: { "*": "deny" } }));
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));

  expect(await readLayeredPolicy(project)).toMatchObject({
    status: "valid",
    warnings: [
      `the policy key default.* in ${projectFile} overrides the value set in ${globalFile}`,
    ],
  });
});

test("a key overridden by two later files warns twice, each time naming the file that last set it", async () => {
  await writeAt(globalFile, JSON.stringify({ default: { "*": "deny" } }));
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));
  await writeAt(localFile, JSON.stringify({ default: { "*": "allow" } }));

  expect(await readLayeredPolicy(project)).toMatchObject({
    status: "valid",
    warnings: [
      `the policy key default.* in ${projectFile} overrides the value set in ${globalFile}`,
      `the policy key default.* in ${localFile} overrides the value set in ${projectFile}`,
    ],
  });
});

test("a later file that sets a key to the value it already has is not an override", async () => {
  await writeAt(globalFile, JSON.stringify({ default: { "*": "ask" } }));
  await writeAt(projectFile, JSON.stringify({ default: { "*": "ask" } }));

  expect(await readLayeredPolicy(project)).toMatchObject({ status: "valid", warnings: [] });
});

test("objects and arrays that several files set produce no override warning", async () => {
  await writeAt(
    globalFile,
    JSON.stringify({
      default: { bash: { output_redirection: { "*": "ask" }, allowed_cmds_regex: ["^a$"] } },
    }),
  );
  await writeAt(
    projectFile,
    JSON.stringify({
      default: { bash: { output_redirection: { other: "deny" }, allowed_cmds_regex: ["^b$"] } },
    }),
  );
  await writeAt(
    localFile,
    JSON.stringify({
      default: {
        bash: {
          output_redirection: { stdout_to_dev_null: "allow" },
          allowed_cmds_regex: ["^c$"],
        },
      },
    }),
  );

  expect(await readLayeredPolicy(project)).toMatchObject({ status: "valid", warnings: [] });
});

test("the expected policy locations are the global file, the project file, and the local file", () => {
  expect(policyLocations(project)).toEqual({
    global: globalFile,
    project: projectFile,
    local: localFile,
  });
});
