import { readFile } from "node:fs/promises";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";
import { isRecord } from "./json.ts";
import { isLevel, type Level } from "./level.ts";

export const POLICY_FILE_NAME = "lovely-permissions.jsonc";
export const DEFAULT_MODE = "default";

/** The keys a mode may have. Its bash block is checked by the engine, not here. */
const MODE_KEYS = ["bash", "*"];

type Invalid = { status: "invalid"; file: string; reason: string };

export type ModePolicy = { bash: Record<string, unknown>; wildcard: Level | undefined };

export type PolicyFile =
  | { status: "absent" }
  | Invalid
  | { status: "valid"; modes: Record<string, Record<string, unknown>> };

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
  const wildcard = mode["*"];
  return {
    bash: isRecord(mode.bash) ? mode.bash : {},
    wildcard: isLevel(wildcard) ? wildcard : undefined,
  };
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
    const unknownKey = Object.keys(mode).find((key) => !MODE_KEYS.includes(key));
    if (unknownKey !== undefined) {
      const valid = MODE_KEYS.map((key) => `'${key}'`).join(", ");
      return invalid(
        file,
        `unknown key '${unknownKey}' in the "${name}" mode; valid keys are ${valid}`,
      );
    }
    if (mode.bash !== undefined && !isRecord(mode.bash)) {
      return invalid(file, `the "bash" block of the "${name}" mode is not an object`);
    }
    if (mode["*"] !== undefined && !isLevel(mode["*"])) {
      return invalid(
        file,
        `the "*" of the "${name}" mode should be 'allow', 'ask' or 'deny' (got ${describeValue(mode["*"])})`,
      );
    }
    modes[name] = mode;
  }

  return { status: "valid", modes };
}

function invalid(file: string, reason: string): Invalid {
  return { status: "invalid", file, reason };
}

function describeValue(value: unknown): string {
  return typeof value === "string" ? `'${value}'` : JSON.stringify(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
