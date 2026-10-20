import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sandboxRoot } from "./sandbox.ts";

export interface StubEngine {
  /** Executable path, for `LOVELY_PI_BASH_PERMISSIONS_BIN` or a directory on PATH. */
  readonly path: string;
  /** Every request the stub has read, in the order it read them. Its length is the invocation count. */
  requests(): Record<string, unknown>[];
}

/**
 * A stand-in for `lovely-pi-bash-permissions`. Each run reads one request from
 * stdin, appends it to the record, and writes `response` to stdout. A string
 * `response` is written as it is, for an engine that answers with something other than JSON.
 *
 * The shebang is the absolute Node binary, because tests run with PATH pointing
 * at an empty directory and `/usr/bin/env node` would not find Node.
 */
export function stubEngine(response: Record<string, unknown> | string): StubEngine {
  const dir = mkdtempSync(join(sandboxRoot, "engine-"));
  const path = join(dir, "lovely-pi-bash-permissions");
  const record = join(dir, "requests.jsonl");
  writeFileSync(
    path,
    [
      `#!${process.execPath}`,
      `const { appendFileSync } = require("node:fs");`,
      `let input = "";`,
      `process.stdin.setEncoding("utf8");`,
      `process.stdin.on("data", (chunk) => { input += chunk; });`,
      `process.stdin.on("end", () => {`,
      `  appendFileSync(${JSON.stringify(record)}, JSON.stringify(JSON.parse(input)) + "\\n");`,
      `  process.stdout.write(${JSON.stringify(`${typeof response === "string" ? response : JSON.stringify(response)}\n`)});`,
      `});`,
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  return {
    path,
    requests: () => {
      if (!existsSync(record)) return [];
      return readFileSync(record, "utf8")
        .split("\n")
        .filter((line) => line !== "")
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    },
  };
}
