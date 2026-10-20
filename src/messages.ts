import { ENGINE_BINARY, ENGINE_OVERRIDE } from "./engine.ts";

export const ASK_LABEL = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]";
export const DENY_LABEL = "[♡ perms: ❤️ auto-rejected]";
export const NOT_RUN = "The tool has not been run.";

export const UNMATCHED_REASON = "the command could not be matched to its tool call";

/** An ask: the label, then one bullet per reason. */
export function askMessage(reasons: readonly string[]): string {
  return [ASK_LABEL, ...bullets(reasons)].join("\n");
}

/** A deny: the label, one bullet per reason, then the closing sentence. */
export function denyMessage(reasons: readonly string[]): string {
  return [DENY_LABEL, ...bullets(reasons), NOT_RUN].join("\n");
}

export function invalidPolicyReason(file: string, reason: string): string {
  return `the policy file ${file} could not be used: ${reason}. Fix the file and restart OpenCode.`;
}

export const ENGINE_NOT_FOUND_REASON = `${ENGINE_BINARY} was not found. Install it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to the path of an existing engine binary.`;

function bullets(reasons: readonly string[]): string[] {
  return reasons.map((reason) => `- ${reason}`);
}
