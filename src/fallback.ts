import type { ModePolicy } from "./policy-file.ts";

/** The level for a policy value. Anything other than allow or deny asks. */
export function levelOf(value: unknown): "allow" | "ask" | "deny" {
  return value === "allow" || value === "deny" ? value : "ask";
}

/**
 * The level for a construct the engine gave no verdict for: the construct's own level,
 * then the bash block's `*`, then the mode's `*`, then `ask`. An unknown level asks.
 */
export function fallbackLevel(mode: ModePolicy, key: string): "allow" | "ask" | "deny" {
  return levelOf(mode.bash[key] || mode.bash["*"] || mode.wildcard);
}
