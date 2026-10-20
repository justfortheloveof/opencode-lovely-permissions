import { unknownModeReason } from "./messages.ts";
import { DEFAULT_MODE } from "./policy-file.ts";
import { readLayeredPolicy } from "./policy-layers.ts";

export type ModeSelection =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "unknown-mode"; mode: string; modes: string[]; reason: string }
  | { status: "valid"; mode: string; bash: Record<string, unknown>; wildcard: unknown };

/** The mode named by the `mode` option, or the default mode when no option is set. */
export async function selectMode(
  directory: string,
  option: string | undefined,
): Promise<ModeSelection> {
  const policy = await readLayeredPolicy(directory);
  if (policy.status !== "valid") return policy;

  const mode = option ?? DEFAULT_MODE;
  const modes = Object.keys(policy.modes);
  if (!Object.hasOwn(policy.modes, mode)) {
    return { status: "unknown-mode", mode, modes, reason: unknownModeReason(mode, modes) };
  }
  const { bash, wildcard } = policy.modes[mode];
  return { status: "valid", mode, bash, wildcard };
}
