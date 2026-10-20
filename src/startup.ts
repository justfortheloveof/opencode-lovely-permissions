import { validate } from "./engine-client.ts";
import {
  denyMessage,
  engineUnusableReason,
  ENGINE_NOT_FOUND_REASON,
  invalidFileReason,
  rejectedPolicyReason,
} from "./messages.ts";
import { readLayeredPolicy } from "./policy-layers.ts";

/** A blocked plugin denies every shell call with its message. Later failures reuse this state. */
export type Startup = { status: "ready" } | { status: "blocked"; message: string };

const DEFAULT_MODE = "default";
const READY: Startup = { status: "ready" };

export async function checkStartup(
  directory: string,
  engine: string | undefined,
): Promise<Startup> {
  if (engine === undefined) return blocked(ENGINE_NOT_FOUND_REASON);

  const policy = await readLayeredPolicy(directory);
  if (policy.status === "absent") return READY;
  if (policy.status === "invalid") return blocked(invalidFileReason(policy.file, policy.reason));

  try {
    const validation = await validate(engine, policy.modes[DEFAULT_MODE].bash);
    return validation.valid ? READY : blocked(rejectedPolicyReason(validation.error));
  } catch (error) {
    return blocked(engineUnusableReason(error instanceof Error ? error.message : String(error)));
  }
}

function blocked(reason: string): Startup {
  return { status: "blocked", message: denyMessage([reason]) };
}
