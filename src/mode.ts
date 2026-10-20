import { unknownModeReason } from "./messages.ts";
import type { LayeredPolicy } from "./policy-layers.ts";

export type ModeSelection =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "unknown-mode"; mode: string; modes: string[]; reason: string }
  | { status: "valid"; mode: string; bash: Record<string, unknown>; wildcard: unknown };

/** The mode the `mode` option names, looked up in the layered policy. */
export function selectMode(policy: LayeredPolicy, mode: string): ModeSelection {
  if (policy.status !== "valid") return policy;

  const modes = Object.keys(policy.modes);
  if (!Object.hasOwn(policy.modes, mode)) {
    return { status: "unknown-mode", mode, modes, reason: unknownModeReason(mode, modes) };
  }
  const { bash, wildcard } = policy.modes[mode];
  return { status: "valid", mode, bash, wildcard };
}
