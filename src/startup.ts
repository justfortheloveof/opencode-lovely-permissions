import { ProtocolMismatchError, validate } from "./engine-client.ts";
import {
  denyMessage,
  engineUnusableReason,
  ENGINE_NOT_FOUND_REASON,
  invalidPolicyReason,
  protocolMismatchReason,
  rejectedPolicyReason,
} from "./messages.ts";
import type { ModePolicy } from "./policy-file.ts";
import type { LayeredPolicy } from "./policy-layers.ts";

/** Ready names the engine to ask about each command. Blocked denies every shell call with its message. */
export type Startup = { status: "ready"; engine: string } | { status: "blocked"; message: string };

export async function checkStartup(
  engine: string | undefined,
  policy: LayeredPolicy,
  mode: ModePolicy,
): Promise<Startup> {
  if (engine === undefined) return blocked(ENGINE_NOT_FOUND_REASON);
  if (policy.status === "invalid") return blocked(invalidPolicyReason(policy.file, policy.reason));

  try {
    const validation = await validate(engine, mode.bash);
    return validation.valid
      ? { status: "ready", engine }
      : blocked(rejectedPolicyReason(validation.error));
  } catch (error) {
    if (error instanceof ProtocolMismatchError) return blocked(protocolMismatchReason(error.found));
    return blocked(engineUnusableReason(error instanceof Error ? error.message : String(error)));
  }
}

function blocked(reason: string): Startup {
  return { status: "blocked", message: denyMessage([reason]) };
}
