import { ENGINE_BINARY, ENGINE_OVERRIDE } from "./engine.ts";

export const DENY_LABEL = "[♡ perms: ❤️ auto-rejected]";
export const NOT_RUN = "The tool has not been run.";

/** A deny: the label, one bullet per reason, then the closing sentence. */
export function denyMessage(reasons: readonly string[]): string {
  return [DENY_LABEL, ...reasons.map((reason) => `- ${reason}`), NOT_RUN].join("\n");
}

export const ENGINE_NOT_FOUND_REASON = `${ENGINE_BINARY} was not found. Install it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to the path of an existing engine binary.`;

export function invalidFileReason(file: string, reason: string): string {
  return `The policy file ${file} is invalid: ${reason}. Fix the file and restart OpenCode.`;
}

export function rejectedPolicyReason(error: string): string {
  return `The bash policy is invalid: ${error}. Fix the policy file and restart OpenCode.`;
}

export function engineUnusableReason(detail: string): string {
  return `The bash engine could not check the policy: ${detail}. Reinstall it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to a working engine binary, then restart OpenCode.`;
}
