import { execFileSync } from "node:child_process";
import { describe, expect, test } from "bun:test";
import { stubEngine } from "./support/stub-engine.ts";

const RESPONSE = { protocol: 1, action: "allow", reason: "", reasons: [] };
const REQUEST = { op: "evaluate", command: "git status", config: {}, top_level: "ask" };

function run(path: string, request: unknown): unknown {
  return JSON.parse(execFileSync(path, [], { input: JSON.stringify(request), encoding: "utf8" }));
}

describe("the stub engine", () => {
  test("records nothing before it is run", () => {
    expect(stubEngine(RESPONSE).requests()).toEqual([]);
  });

  test("reads one request, records it, and writes the response", () => {
    const engine = stubEngine(RESPONSE);
    expect(run(engine.path, REQUEST)).toEqual(RESPONSE);
    expect(engine.requests()).toEqual([REQUEST]);
  });

  test("records every run in order", () => {
    const engine = stubEngine(RESPONSE);
    run(engine.path, REQUEST);
    run(engine.path, { ...REQUEST, command: "ls" });
    expect(engine.requests()).toEqual([REQUEST, { ...REQUEST, command: "ls" }]);
  });
});
