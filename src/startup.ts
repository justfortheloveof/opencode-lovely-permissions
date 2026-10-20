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
 * every shell call. Blocked denies every shell call with its message.
 */
export type Startup =
  | { status: "ready"; engine: string; mode: ModePolicy }
  | { status: "no-policy" }
  | { status: "blocked"; message: string };

/**
 * Checks the engine and the selected mode before the first shell call. Each file's bash
 * block is validated on its own before the merged block, so a rejection names the file.
 */
export async function checkStartup(
  engine: string | undefined,
  selection: ModeSelection,
  sources: readonly BashSource[],
): Promise<Startup> {
  if (engine === undefined) return blocked(ENGINE_NOT_FOUND_REASON);
  if (selection.status === "invalid") {
    return blocked(invalidPolicyReason(selection.file, selection.reason));
  }
  if (selection.status === "unknown-mode") return blocked(selection.reason);

  const mergedBash = selection.status === "valid" ? selection.bash : {};
  try {
    for (const source of sources) {
      const single = await validate(engine, source.bash);
      if (!single.valid) return blocked(rejectedPolicyReason([source.file], single.error));
    }
    const merged = await validate(engine, mergedBash);
    if (!merged.valid) {
      return blocked(
        rejectedPolicyReason(
          sources.map((source) => source.file),
          merged.error,
        ),
      );
    }
  } catch (error) {
    if (error instanceof ProtocolMismatchError) return blocked(protocolMismatchReason(error.found));
    return blocked(engineUnusableReason(error instanceof Error ? error.message : String(error)));
  }

  if (selection.status === "absent") return { status: "no-policy" };
  return {
    status: "ready",
    engine,
    mode: { bash: selection.bash, wildcard: selection.wildcard },
  };
}

function blocked(reason: string): Startup {
  return { status: "blocked", message: denyMessage([reason]) };
}
