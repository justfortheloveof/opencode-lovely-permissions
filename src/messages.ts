import { ENGINE_BINARY, ENGINE_OVERRIDE } from "./engine.ts";
import { PROTOCOL_VERSION } from "./engine-client.ts";

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

export function rejectedPolicyReason(error: string): string {
  return `the bash engine rejected the policy: ${error}. Fix what it names, then restart OpenCode.`;
}

export function engineUnusableReason(detail: string): string {
  return `the bash engine did not start or answer: ${detail}. Reinstall it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to a working engine binary, then restart OpenCode.`;
}

export function protocolMismatchReason(found: unknown): string {
  const answered =
    found === undefined ? "no protocol version" : `protocol ${JSON.stringify(found)}`;
  return `the bash engine answered with ${answered}, but this plugin needs protocol ${PROTOCOL_VERSION}. Install an engine that speaks protocol ${PROTOCOL_VERSION} with \`uv tool install --force lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to one, or update this plugin to a version that matches the engine, then restart OpenCode.`;
}

export const ENGINE_NOT_FOUND_REASON = `${ENGINE_BINARY} was not found. Install it with \`uv tool install lovely-bash-permissions\`, or set ${ENGINE_OVERRIDE} to the path of an existing engine binary.`;

export function unknownModeReason(mode: string, modes: readonly string[]): string {
  const names = modes.map((name) => `"${name}"`).join(", ");
  return `the mode option selects "${mode}", but no policy file defines that mode. The modes that exist are: ${names}. Set the mode option to one of them, then restart OpenCode.`;
}

function bullets(reasons: readonly string[]): string[] {
  return reasons.map((reason) => `- ${reason}`);
}
