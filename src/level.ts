/** A level: what a construct, a bash block, or a mode says to do with a command. */
export type Level = "allow" | "ask" | "deny";

export function isLevel(value: unknown): value is Level {
  return value === "allow" || value === "ask" || value === "deny";
}
