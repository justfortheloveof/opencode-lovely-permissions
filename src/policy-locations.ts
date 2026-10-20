import { homedir } from "node:os";
import { join } from "node:path";
import { POLICY_FILE_NAME } from "./policy-file.ts";

const LOCAL_POLICY_FILE_NAME = "lovely-permissions.local.jsonc";

export interface PolicyLocations {
  global: string;
  project: string;
  local: string;
}

/**
 * Where the three policy files live for a project. The global directory is
 * OPENCODE_CONFIG_DIR if set, else XDG_CONFIG_HOME/opencode, else ~/.config/opencode.
 * Later files win over earlier ones.
 */
export function policyLocations(
  directory: string,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): PolicyLocations {
  const projectDirectory = join(directory, ".opencode");
  return {
    global: join(globalConfigDirectory(env, home), POLICY_FILE_NAME),
    project: join(projectDirectory, POLICY_FILE_NAME),
    local: join(projectDirectory, LOCAL_POLICY_FILE_NAME),
  };
}

function globalConfigDirectory(env: NodeJS.ProcessEnv, home: string): string {
  if (env.OPENCODE_CONFIG_DIR) return env.OPENCODE_CONFIG_DIR;
  return join(env.XDG_CONFIG_HOME || join(home, ".config"), "opencode");
}
