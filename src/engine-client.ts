import { spawn } from "node:child_process";
import { isRecord } from "./json.ts";
import { isLevel, type Level } from "./level.ts";

export const PROTOCOL_VERSION = 1;
const TIMEOUT_MS = 5_000;

export class EngineError extends Error {}

/** The engine answered, but with a protocol version other than the one this plugin speaks. */
export class ProtocolMismatchError extends EngineError {
  constructor(readonly found: unknown) {
    super(
      `the engine answered with protocol ${String(found)}; this plugin needs protocol ${PROTOCOL_VERSION}`,
    );
  }
}

export interface EvaluateRequest {
  command: string;
  bash: Record<string, unknown>;
  topLevel: Level;
}

export interface Verdict {
  action: Level;
  reasons: string[];
}

export type Validation = { valid: true } | { valid: false; error: string };

/** Runs the engine once for one command line. Rejects with an EngineError when it gives no verdict. */
export function evaluate(engine: string, request: EvaluateRequest): Promise<Verdict> {
  return exchange(engine, {
    op: "evaluate",
    command: request.command,
    config: request.bash,
    top_level: request.topLevel,
  }).then(verdictFrom);
}

/** Runs the engine once to check a bash block. Rejects with an EngineError when it gives no answer. */
export async function validate(engine: string, bash: Record<string, unknown>): Promise<Validation> {
  const answer = await exchange(engine, { op: "validate", config: bash });
  if (answer.valid === true) return { valid: true };
  if (answer.valid === false && typeof answer.error === "string") {
    return { valid: false, error: answer.error };
  }
  throw new EngineError("the engine answered without a validation result");
}

function exchange(engine: string, payload: object): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = spawn(engine, [], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new EngineError(`it could not be started: ${error.message}`));
    });
    child.stdin.on("error", () => {
      // A failed write means the engine went away. The error or close event reports why.
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new EngineError(`the engine did not answer within ${TIMEOUT_MS / 1000} seconds`));
        return;
      }
      try {
        resolve(answerFrom(stdout, uncleanExit(code, signal)));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(`${JSON.stringify(payload)}\n`);
  });
}

function answerFrom(stdout: string, exit: string | undefined): Record<string, unknown> {
  const answer = parseAnswer(stdout, exit);
  if (answer.protocol !== PROTOCOL_VERSION) {
    throw new ProtocolMismatchError(answer.protocol);
  }
  return answer;
}

/** How the engine exited when that was not a clean exit, or undefined for code 0. */
function uncleanExit(code: number | null, signal: NodeJS.Signals | null): string | undefined {
  if (code === 0) return undefined;
  return signal === null ? `with code ${code}` : `on signal ${signal}`;
}

function verdictFrom(answer: Record<string, unknown>): Verdict {
  const { action, reason, reasons, error } = answer;
  if (typeof action !== "string" || typeof reason !== "string" || !Array.isArray(reasons)) {
    throw new EngineError(
      typeof error === "string" ? error : "the engine answered without a verdict",
    );
  }
  return { action: isLevel(action) ? action : "deny", reasons };
}

function parseAnswer(stdout: string, exit: string | undefined): Record<string, unknown> {
  let answer: unknown;
  try {
    answer = JSON.parse(stdout);
  } catch {
    throw noAnswer(exit);
  }
  if (!isRecord(answer)) {
    throw noAnswer(exit);
  }
  return answer;
}

function noAnswer(exit: string | undefined): EngineError {
  return new EngineError(
    exit === undefined
      ? "it did not answer with one JSON object"
      : `it exited ${exit} before answering`,
  );
}
