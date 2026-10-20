import { isRecord } from "./json.ts";
import { overriddenKeyWarning } from "./messages.ts";
import { readPolicyFile, toModePolicy, type ModePolicy, type PolicyFile } from "./policy-file.ts";
import type { PolicyLocations } from "./policy-locations.ts";

export type LayeredPolicy =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "valid"; modes: Record<string, ModePolicy>; warnings: string[] };

/** One of the three policy files as it was read, with the file it came from. */
export interface Layer {
  file: string;
  policy: PolicyFile;
}

export interface BashSource {
  file: string;
  bash: Record<string, unknown>;
}

/** Reads the global, project, and local files in merge order. Each file is read once. */
export async function readLayers(locations: PolicyLocations): Promise<Layer[]> {
  const layers: Layer[] = [];
  for (const file of [locations.global, locations.project, locations.local]) {
    layers.push({ file, policy: await readPolicyFile(file) });
  }
  return layers;
}

/**
 * The layers merged per mode name, later layers winning. The policy is invalid at the
 * first invalid file, and absent when no file exists.
 */
export function layeredPolicy(layers: readonly Layer[]): LayeredPolicy {
  const merged: Record<string, Record<string, unknown>> = {};
  const origins = new Map<string, string>();
  const warnings: string[] = [];
  for (const { file, policy } of layers) {
    if (policy.status === "absent") continue;
    if (policy.status === "invalid") return policy;
    const state: MergeState = { file, origins, warnings };
    for (const [name, mode] of Object.entries(policy.modes)) {
      const earlier = Object.hasOwn(merged, name) ? merged[name] : {};
      merged[name] = mergeLayer(earlier, mode, name, state);
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

/**
 * The bash block each policy file gives `mode`, in merge order, so that a block the
 * engine rejects can be blamed on the file it came from.
 */
export function bashSources(layers: readonly Layer[], mode: string): BashSource[] {
  const sources: BashSource[] = [];
  for (const { file, policy } of layers) {
    if (policy.status !== "valid" || !Object.hasOwn(policy.modes, mode)) continue;
    const bash = policy.modes[mode].bash;
    if (isRecord(bash)) sources.push({ file, bash });
  }
  return sources;
}

/** What a merge carries besides the values: the file laid over the rest, the file that last set each dotted key, and the warnings so far. */
interface MergeState {
  file: string;
  origins: Map<string, string>;
  warnings: string[];
}

/**
 * Lays one file's value over what the earlier files left. Objects merge and arrays
 * concatenate. Any other value replaces the earlier one, and a replacement that changes
 * a value set earlier is recorded as a warning. The origins hold, per dotted key, the
 * file that last set it, so the warning can name both files.
 */
function mergeLayer(
  earlier: Record<string, unknown>,
  later: Record<string, unknown>,
  path: string,
  state: MergeState,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...earlier };
  for (const [key, value] of Object.entries(later)) {
    const dotted = `${path}.${key}`;
    const has = Object.hasOwn(earlier, key);
    const before = has ? earlier[key] : undefined;
    if (isRecord(value) && (isRecord(before) || !has)) {
      merged[key] = mergeLayer(isRecord(before) ? before : {}, value, dotted, state);
    } else if (Array.isArray(before) && Array.isArray(value)) {
      merged[key] = [...before, ...value];
    } else {
      const previous = state.origins.get(dotted);
      if (has && before !== value && previous !== undefined) {
        state.warnings.push(overriddenKeyWarning(dotted, previous, state.file));
      }
      merged[key] = value;
    }
    state.origins.set(dotted, state.file);
  }
  return merged;
}
