import { homedir } from "node:os";
import { join } from "node:path";
import {
  isRecord,
  POLICY_FILE_NAME,
  readPolicyFile,
  toModePolicy,
  type ModePolicy,
} from "./policy-file.ts";

const LOCAL_POLICY_FILE_NAME = "lovely-permissions.local.jsonc";

export type LayeredPolicy =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "valid"; modes: Record<string, ModePolicy> };

export async function readLayeredPolicy(directory: string): Promise<LayeredPolicy> {
  const projectDirectory = join(directory, ".opencode");
  const files = [
    join(globalConfigDirectory(), POLICY_FILE_NAME),
    join(projectDirectory, POLICY_FILE_NAME),
    join(projectDirectory, LOCAL_POLICY_FILE_NAME),
  ];

  const merged: Record<string, Record<string, unknown>> = {};
  for (const file of files) {
    const policy = await readPolicyFile(file);
    if (policy.status === "absent") {
      continue;
    }
    if (policy.status === "invalid") {
      return policy;
    }
    for (const [name, mode] of Object.entries(policy.modes)) {
      merged[name] = Object.hasOwn(merged, name) ? mergeObjects(merged[name], mode) : mode;
    }
  }

  const names = Object.keys(merged);
  if (names.length === 0) {
    return { status: "absent" };
  }
  return {
    status: "valid",
    modes: Object.fromEntries(names.map((name) => [name, toModePolicy(merged[name])])),
  };
}

function globalConfigDirectory(): string {
  const override = process.env.OPENCODE_CONFIG_DIR;
  if (override) {
    return override;
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode");
}

function mergeObjects(
  earlier: Record<string, unknown>,
  later: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...earlier };
  for (const [key, value] of Object.entries(later)) {
    merged[key] = mergeValues(earlier[key], value);
  }
  return merged;
}

function mergeValues(earlier: unknown, later: unknown): unknown {
  if (isRecord(earlier) && isRecord(later)) {
    return mergeObjects(earlier, later);
  }
  if (Array.isArray(earlier) && Array.isArray(later)) {
    return [...earlier, ...later];
  }
  return later;
}
