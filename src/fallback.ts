import type { ModePolicy } from "./policy-file.ts";

/**
 * The level for a construct the engine gave no verdict for: the construct's own level,
 * then the bash block's `*`, then the mode's `*`, then `ask`. An unknown level asks.
 */
export function fallbackLevel(mode: ModePolicy, key: string): "allow" | "ask" | "deny" {
  const level = mode.bash[key] || mode.bash["*"] || mode.wildcard;
  return level === "allow" || level === "deny" ? level : "ask";
}
