import { ProtocolMismatchError, validate } from "./engine-client.ts";
import {
  denyMessage,
  engineUnusableReason,
  ENGINE_NOT_FOUND_REASON,
  invalidPolicyReason,
  protocolMismatchReason,
  rejectedPolicyReason,
} from "./messages.ts";
import type { ModeSelection } from "./mode.ts";
import type { ModePolicy } from "./policy-file.ts";
import type { BashSource } from "./policy-layers.ts";

/**
 * Ready names the engine and the mode each shell call is judged by. No-policy asks for
 * every shell call. Failed denies every shell call with its message.
 */
export type Startup =
  | { status: "ready"; engine: string; mode: ModePolicy }
  | { status: "no-policy" }
  | Failed;

export type Failed = { status: "failed"; message: string };

/**
 * Checks the engine and the selected mode before the first shell call. Each file's bash
 * block is validated on its own before the merged block, so a rejection names the file.
 */
export async function checkStartup(
  engine: string | undefined,
  selection: ModeSelection,
  sources: readonly BashSource[],
): Promise<Startup> {
  if (engine === undefined) return failure(ENGINE_NOT_FOUND_REASON);
  if (selection.status === "invalid") {
    return failure(invalidPolicyReason(selection.file, selection.reason));
  }
  if (selection.status === "unknown-mode") return failure(selection.reason);

  const mergedBash = selection.status === "valid" ? selection.policy.bash : {};
  try {
    for (const source of sources) {
      const single = await validate(engine, source.bash);
      if (!single.valid) return failure(rejectedPolicyReason([source.file], single.error));
    }
    const merged = await validate(engine, mergedBash);
    if (!merged.valid) {
      return failure(
        rejectedPolicyReason(
          sources.map((source) => source.file),
          merged.error,
        ),
      );
    }
  } catch (error) {
    if (error instanceof ProtocolMismatchError) return failure(protocolMismatchReason(error.found));
    return failure(engineUnusableReason(error instanceof Error ? error.message : String(error)));
  }

  if (selection.status === "absent") return { status: "no-policy" };
  return {
    status: "ready",
    engine,
    mode: selection.policy,
  };
}

/** The failed state for one reason: every shell call is denied with the reason as its message. */
export function failure(reason: string): Failed {
  return { status: "failed", message: denyMessage([reason]) };
}
