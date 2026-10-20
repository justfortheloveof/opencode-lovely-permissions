import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sandboxRoot } from "./sandbox.ts";

export interface StubEngine {
  /** Executable path, for `LOVELY_PI_BASH_PERMISSIONS_BIN` or a directory on PATH. */
  readonly path: string;
  /** Every request the stub has read, in the order it read them. Its length is the invocation count. */
  requests(): Record<string, unknown>[];
  /** The process ID of every run, in order, so a test can check that a run was killed. */
  pids(): number[];
}

/** A reply that is never written. The stub reads the request and then waits, so only the plugin can end the run. */
export const NEVER_ANSWERS = { neverAnswers: true } as const;

/** What the stub writes for a command: a response object, text as it is, or nothing at all. */
export type StubReply = Record<string, unknown> | string | typeof NEVER_ANSWERS;

/**
 * A stand-in for `lovely-pi-bash-permissions`. Each run reads one request from
 * stdin, appends it to the record, and writes the reply for its command to stdout.
 * `byCommand` gives specific command lines their own reply, and `reply` answers every other one.
 * A string reply is written as it is, for an engine that answers with something other than JSON.
 *
 * The shebang is the absolute Node binary, because tests run with PATH pointing
 * at an empty directory and `/usr/bin/env node` would not find Node.
 */
export function stubEngine(
  reply: StubReply,
  byCommand: Record<string, StubReply> = {},
): StubEngine {
  const dir = mkdtempSync(join(sandboxRoot, "engine-"));
  const path = join(dir, "lovely-pi-bash-permissions");
  const record = join(dir, "requests.jsonl");
  const pids = join(dir, "pids.txt");
  const outputs = {
    fallback: render(reply),
    byCommand: Object.fromEntries(
      Object.entries(byCommand).map(([command, value]) => [command, render(value)]),
    ),
  };
  writeFileSync(
    path,
    [
      `#!${process.execPath}`,
      `const { appendFileSync } = require("node:fs");`,
      `const outputs = ${JSON.stringify(outputs)};`,
      `let input = "";`,
      `process.stdin.setEncoding("utf8");`,
      `process.stdin.on("data", (chunk) => { input += chunk; });`,
      `process.stdin.on("end", () => {`,
      `  const request = JSON.parse(input);`,
      `  appendFileSync(${JSON.stringify(record)}, JSON.stringify(request) + "\\n");`,
      `  appendFileSync(${JSON.stringify(pids)}, process.pid + "\\n");`,
      `  const output = Object.hasOwn(outputs.byCommand, request.command) ? outputs.byCommand[request.command] : outputs.fallback;`,
      `  if (output === null) { setTimeout(() => {}, 30000); return; }`,
      `  process.stdout.write(output);`,
      `});`,
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  return {
    path,
    requests: () => readLines(record).map((line) => JSON.parse(line) as Record<string, unknown>),
    pids: () => readLines(pids).map(Number),
  };
}

function render(reply: StubReply): string | null {
  if (reply === NEVER_ANSWERS) return null;
  return `${typeof reply === "string" ? reply : JSON.stringify(reply)}\n`;
}

function readLines(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line !== "");
}
