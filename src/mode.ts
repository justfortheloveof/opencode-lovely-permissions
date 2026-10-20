import { unknownModeReason } from "./messages.ts";
import type { ModePolicy } from "./policy-file.ts";
import type { LayeredPolicy } from "./policy-layers.ts";

export type ModeSelection =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "unknown-mode"; mode: string; reason: string }
  | { status: "valid"; mode: string; policy: ModePolicy };

/** The mode the `mode` option names, looked up in the layered policy. */
export function selectMode(policy: LayeredPolicy, mode: string): ModeSelection {
  if (policy.status !== "valid") return policy;

  if (!Object.hasOwn(policy.modes, mode)) {
    const modes = Object.keys(policy.modes);
    return { status: "unknown-mode", mode, reason: unknownModeReason(mode, modes) };
  }
  return { status: "valid", mode, policy: policy.modes[mode] };
}
