import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, printParseErrorCode, type ParseError } from "jsonc-parser";

const POLICY_FILE_NAME = "lovely-permissions.jsonc";
const DEFAULT_MODE = "default";

export type ProjectPolicy =
  | { status: "absent" }
  | { status: "invalid"; file: string; reason: string }
  | { status: "valid"; file: string; bash: Record<string, unknown>; wildcard: unknown };

export async function readProjectPolicy(directory: string): Promise<ProjectPolicy> {
  const file = join(directory, ".opencode", POLICY_FILE_NAME);
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

function parsePolicy(file: string, text: string): ProjectPolicy {
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

  const mode = parsed[DEFAULT_MODE];
  if (mode === undefined) {
    return invalid(file, `it has no "${DEFAULT_MODE}" mode`);
  }
  if (!isRecord(mode)) {
    return invalid(file, `the "${DEFAULT_MODE}" mode is not an object`);
  }

  const bash = mode.bash === undefined ? {} : mode.bash;
  if (!isRecord(bash)) {
    return invalid(file, `the "bash" block of the "${DEFAULT_MODE}" mode is not an object`);
  }

  return { status: "valid", file, bash, wildcard: mode["*"] };
}

function invalid(file: string, reason: string): ProjectPolicy {
  return { status: "invalid", file, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
