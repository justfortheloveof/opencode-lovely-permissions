import { ENGINE_BINARY, ENGINE_OVERRIDE } from "./engine.ts";

export const DENY_LABEL = "[♡ perms: ❤️ auto-rejected]";
export const NOT_RUN = "The tool has not been run.";

/** A deny: the label, one bullet per reason, then the closing sentence. */
export function denyMessage(reasons: readonly string[]): string {
  return [DENY_LABEL, ...reasons.map((reason) => `- ${reason}`), NOT_RUN].join("\n");
}

export const ENGINE_NOT_FOUND_REASON = `${ENGINE_BINARY} was not found. Install it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to the path of an existing engine binary.`;

export function unknownModeReason(mode: string, modes: readonly string[]): string {
  const names = modes.map((name) => `"${name}"`).join(", ");
  return `the mode option selects "${mode}", but no policy file defines that mode. The modes that exist are: ${names}. Set the mode option to one of them, then restart OpenCode.`;
}
