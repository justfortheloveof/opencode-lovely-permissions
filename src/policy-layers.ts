import { homedir } from "node:os";
import { join } from "node:path";
import { overriddenKeyWarning } from "./messages.ts";
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
  | { status: "valid"; modes: Record<string, ModePolicy>; warnings: string[] };

export interface PolicyLocations {
  global: string;
  project: string;
  local: string;
}

export interface BashSource {
  file: string;
  bash: Record<string, unknown>;
}

/** Where the three policy files live for a project. Later files win over earlier ones. */
export function policyLocations(directory: string): PolicyLocations {
  const projectDirectory = join(directory, ".opencode");
  return {
    global: join(globalConfigDirectory(), POLICY_FILE_NAME),
    project: join(projectDirectory, POLICY_FILE_NAME),
    local: join(projectDirectory, LOCAL_POLICY_FILE_NAME),
  };
}

/**
 * The bash block each policy file gives `mode`, in merge order, so that a block the
 * engine rejects can be blamed on the file it came from.
 */
export async function bashSources(directory: string, mode: string): Promise<BashSource[]> {
  const { global, project, local } = policyLocations(directory);
  const sources: BashSource[] = [];
  for (const file of [global, project, local]) {
    const policy = await readPolicyFile(file);
    if (policy.status !== "valid" || !Object.hasOwn(policy.modes, mode)) continue;
    const bash = policy.modes[mode].bash;
    if (isRecord(bash)) sources.push({ file, bash });
  }
  return sources;
}

export async function readLayeredPolicy(directory: string): Promise<LayeredPolicy> {
  const locations = policyLocations(directory);
  const files = [locations.global, locations.project, locations.local];

  const merged: Record<string, Record<string, unknown>> = {};
  const origins = new Map<string, string>();
  const warnings: string[] = [];
  for (const file of files) {
    const policy = await readPolicyFile(file);
    if (policy.status === "absent") {
      continue;
    }
    if (policy.status === "invalid") {
      return policy;
    }
    for (const [name, mode] of Object.entries(policy.modes)) {
      const earlier = Object.hasOwn(merged, name) ? merged[name] : {};
      merged[name] = mergeLayer(earlier, mode, name, file, origins, warnings);
    }
  }

  const names = Object.keys(merged);
  if (names.length === 0) {
    return { status: "absent" };
  }
  return {
    status: "valid",
    modes: Object.fromEntries(names.map((name) => [name, toModePolicy(merged[name])])),
    warnings,
  };
}

function globalConfigDirectory(): string {
  const override = process.env.OPENCODE_CONFIG_DIR;
  if (override) {
    return override;
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode");
}

/**
 * Lays one file's value over what the earlier files left. Objects merge and arrays
 * concatenate. Any other value replaces the earlier one, and a replacement that changes
 * a value set earlier is recorded as a warning. `origins` holds, per dotted key, the
 * file that last set it, so the warning can name both files.
 */
function mergeLayer(
  earlier: Record<string, unknown>,
  later: Record<string, unknown>,
  path: string,
  file: string,
  origins: Map<string, string>,
  warnings: string[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...earlier };
  for (const [key, value] of Object.entries(later)) {
    const dotted = `${path}.${key}`;
    const has = Object.hasOwn(earlier, key);
    const before = has ? earlier[key] : undefined;
    if (isRecord(value) && (isRecord(before) || !has)) {
      merged[key] = mergeLayer(
        isRecord(before) ? before : {},
        value,
        dotted,
        file,
        origins,
        warnings,
      );
    } else if (Array.isArray(before) && Array.isArray(value)) {
      merged[key] = [...before, ...value];
    } else {
      const previous = origins.get(dotted);
      if (has && before !== value && previous !== undefined) {
        warnings.push(overriddenKeyWarning(dotted, previous, file));
      }
      merged[key] = value;
    }
    origins.set(dotted, file);
  }
  return merged;
}
