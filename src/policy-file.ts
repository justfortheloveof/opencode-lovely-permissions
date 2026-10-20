import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";

export const POLICY_FILE_NAME = "lovely-permissions.jsonc";
export const DEFAULT_MODE = "default";

type Invalid = { status: "invalid"; file: string; reason: string };

export type ModePolicy = { bash: Record<string, unknown>; wildcard: unknown };

export type PolicyFile =
  | { status: "absent" }
  | Invalid
  | { status: "valid"; file: string; modes: Record<string, Record<string, unknown>> };

export type ProjectPolicy =
  | { status: "absent" }
  | Invalid
  | { status: "valid"; file: string; bash: Record<string, unknown>; wildcard: unknown };

export async function readProjectPolicy(directory: string): Promise<ProjectPolicy> {
  const file = join(directory, ".opencode", POLICY_FILE_NAME);
  const policy = await readPolicyFile(file);
  if (policy.status !== "valid") {
    return policy;
  }
  return { status: "valid", file, ...toModePolicy(policy.modes[DEFAULT_MODE]) };
}

export async function readPolicyFile(file: string): Promise<PolicyFile> {
  let text: string;
  try {
    text = await readFile(file, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { status: "absent" };
    }
    return invalid(file, `it could not be read: ${errorMessage(error)}`);
  }
  return parsePolicy(file, text);
}

export function toModePolicy(mode: Record<string, unknown>): ModePolicy {
  return { bash: isRecord(mode.bash) ? mode.bash : {}, wildcard: mode["*"] };
}

function parsePolicy(file: string, text: string): PolicyFile {
  const content = text.replace(/^\uFEFF/, "");
  if (content.trim() === "") {
    return invalid(file, "the file is empty");
  }

  const errors: ParseError[] = [];
  const parsed: unknown = parse(content, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const [first] = errors;
    const line = content.slice(0, first.offset).split("\n").length;
    return invalid(file, `${printParseErrorCode(first.error)} at line ${line}`);
  }
  if (!isRecord(parsed)) {
    return invalid(file, "it does not hold an object of modes");
  }
  if (parsed[DEFAULT_MODE] === undefined) {
    return invalid(file, `it has no "${DEFAULT_MODE}" mode`);
  }

  const modes: Record<string, Record<string, unknown>> = {};
  for (const [name, mode] of Object.entries(parsed)) {
    if (!isRecord(mode)) {
      return invalid(file, `the "${name}" mode is not an object`);
    }
    if (mode.bash !== undefined && !isRecord(mode.bash)) {
      return invalid(file, `the "bash" block of the "${name}" mode is not an object`);
    }
    modes[name] = mode;
  }

  return { status: "valid", file, modes };
}

function invalid(file: string, reason: string): Invalid {
  return { status: "invalid", file, reason };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
