import { isLevel, type Level } from "./level.ts";
import type { ModePolicy } from "./policy-file.ts";

/** The level for a policy value. Anything other than a level asks. */
export function levelOf(value: unknown): Level {
  return isLevel(value) ? value : "ask";
}

/**
 * The level for a construct the engine gave no verdict for: the construct's own level,
 * then the bash block's `*`, then the mode's `*`, then `ask`.
 */
export function fallbackLevel(mode: ModePolicy, key: string): Level {
  return levelOf(mode.bash[key] || mode.bash["*"] || mode.wildcard);
}
