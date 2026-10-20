import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sandboxRoot } from "./sandbox.ts";

export interface StubEngine {
  /** Executable path, for `LOVELY_PI_BASH_PERMISSIONS_BIN` or a directory on PATH. */
  readonly path: string;
  /** Every request the stub has read, in the order it read them. Its length is the invocation count. */
  requests(): Record<string, unknown>[];
  /** The process ID of every run that was given NEVER_ANSWERS, so a test can check the plugin killed it. */
  hung(): number[];
}

/** A reply that is never written. The stub reads the request and then waits, so only the plugin can end the run. */
export const NEVER_ANSWERS = { neverAnswers: true } as const;

/** What the stub writes for a command: a response object, text as it is, or nothing at all. */
export type StubReply = Record<string, unknown> | string | typeof NEVER_ANSWERS;

/**
 * A stand-in for `lovely-pi-bash-permissions`. Each run reads one request from
 * stdin, appends it to the record, and writes the reply for its command to stdout.
 * `byCommand` gives specific command lines their own reply, and `reply` answers every other one.
 * `byConfig` does the same for validate requests, keyed by the JSON text of the bash block.
 * A string reply is written as it is, for an engine that answers with something other than JSON.
 *
 * The shebang is the absolute Node binary, because tests run with PATH pointing
 * at an empty directory and `/usr/bin/env node` would not find Node.
 */
export function stubEngine(
  reply: StubReply,
  byCommand: Record<string, StubReply> = {},
  byConfig: Record<string, StubReply> = {},
): StubEngine {
  const outputs = {
    fallback: render(reply),
    byCommand: renderAll(byCommand),
    byConfig: renderAll(byConfig),
  };
  return writeStub((record, hung) => [
    `const { appendFileSync } = require("node:fs");`,
    `const outputs = ${JSON.stringify(outputs)};`,
    `let input = "";`,
    `process.stdin.setEncoding("utf8");`,
    `process.stdin.on("data", (chunk) => { input += chunk; });`,
    `process.stdin.on("end", () => {`,
    `  const request = JSON.parse(input);`,
    `  appendFileSync(${JSON.stringify(record)}, JSON.stringify(request) + "\\n");`,
    `  const replies = request.op === "validate" ? outputs.byConfig : outputs.byCommand;`,
    `  const key = request.op === "validate" ? JSON.stringify(request.config) : request.command;`,
    `  const output = Object.hasOwn(replies, key) ? replies[key] : outputs.fallback;`,
    `  if (output === null) {`,
    `    appendFileSync(${JSON.stringify(hung)}, process.pid + "\\n");`,
    `    setTimeout(() => {}, 30000);`,
    `    return;`,
    `  }`,
    `  process.stdout.write(output);`,
    `});`,
  ]);
}

/**
 * A stand-in for an engine that dies on start: it exits with `code` before it reads
 * its request, and it writes no answer. Its requests list is always empty.
 */
export function crashingEngine(code: number): StubEngine {
  return writeStub(() => [`process.exit(${code});`]);
}

function writeStub(body: (record: string, hung: string) => string[]): StubEngine {
  const dir = mkdtempSync(join(sandboxRoot, "engine-"));
  const path = join(dir, "lovely-pi-bash-permissions");
  const record = join(dir, "requests.jsonl");
  const hung = join(dir, "hung.txt");
  writeFileSync(path, [`#!${process.execPath}`, ...body(record, hung)].join("\n"));
  chmodSync(path, 0o755);
  return {
    path,
    requests: () => readLines(record).map((line) => JSON.parse(line) as Record<string, unknown>),
    hung: () => readLines(hung).map(Number),
  };
}

function renderAll(replies: Record<string, StubReply>): Record<string, string | null> {
  return Object.fromEntries(Object.entries(replies).map(([key, value]) => [key, render(value)]));
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
