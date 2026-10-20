import { spawn } from "node:child_process";

const PROTOCOL_VERSION = 1;
const TIMEOUT_MS = 5_000;

export class EngineError extends Error {}

export interface EvaluateRequest {
  command: string;
  bash: Record<string, unknown>;
  topLevel: unknown;
}

export interface Verdict {
  action: string;
  reason: string;
  reasons: string[];
}

/**
 * Runs the engine once for one command line. Rejects with an EngineError when it gives no
 * verdict, including when it has not answered within the timeout, in which case it is killed.
 */
export function evaluate(engine: string, request: EvaluateRequest): Promise<Verdict> {
  const payload = {
    op: "evaluate",
    command: request.command,
    config: request.bash,
    top_level: request.topLevel,
  };
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
      reject(new EngineError(`the engine could not be started: ${error.message}`));
    });
    child.stdin.on("error", () => {
      // A failed write means the engine went away. The error or close event reports why.
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new EngineError(
            `the engine did not answer this command within ${TIMEOUT_MS / 1000} seconds`,
          ),
        );
        return;
      }
      try {
        resolve(verdictFrom(stdout));
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(`${JSON.stringify(payload)}\n`);
  });
}

function verdictFrom(stdout: string): Verdict {
  const answer = parseAnswer(stdout);
  if (answer.protocol !== PROTOCOL_VERSION) {
    throw new EngineError(
      `the engine answered with protocol ${String(answer.protocol)}; this plugin needs protocol ${PROTOCOL_VERSION}`,
    );
  }
  const { action, reason, reasons, error } = answer;
  if (typeof action !== "string" || typeof reason !== "string" || !Array.isArray(reasons)) {
    throw new EngineError(
      typeof error === "string" ? error : "the engine answered without a verdict",
    );
  }
  return { action, reason, reasons };
}

function parseAnswer(stdout: string): Record<string, unknown> {
  let answer: unknown;
  try {
    answer = JSON.parse(stdout);
  } catch {
    throw new EngineError("the engine did not answer with one JSON object");
  }
  if (!isRecord(answer)) {
    throw new EngineError("the engine did not answer with one JSON object");
  }
  return answer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
