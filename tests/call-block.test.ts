import { describe, expect, test } from "bun:test";
import {
  pickCallBlock,
  type Message,
  type Part,
  type PermissionRequest,
  type ToolState,
} from "../src/call-block.ts";

const COMMAND = "git log --oneline -n 5 | grep feat";

function toolPart(id: string, state: ToolState): Part {
  return { type: "tool", id, state };
}

function assistantMessage(id: string, content: Part[]): Message {
  return { id, type: "assistant", content };
}

function shellRequest(overrides: Partial<PermissionRequest> = {}): PermissionRequest {
  return {
    id: "perm-1",
    action: "shell",
    message: "shell ask",
    source: { type: "tool", messageID: "msg-1", id: "part-1" },
    ...overrides,
  };
}

describe("call block rule", () => {
  test("returns the full command line with filetype bash for a running shell call", () => {
    const messages = [
      assistantMessage("msg-1", [
        toolPart("part-1", { status: "running", input: { command: COMMAND } }),
      ]),
    ];

    expect(pickCallBlock(shellRequest(), messages)).toEqual({ content: COMMAND, filetype: "bash" });
  });

  test("resolves a streaming call's string input to the same command line", () => {
    const messages = [
      assistantMessage("msg-1", [toolPart("part-1", { status: "streaming", input: COMMAND })]),
    ];

    expect(pickCallBlock(shellRequest(), messages)).toEqual({ content: COMMAND, filetype: "bash" });
  });

  test("returns nothing when the request has no source", () => {
    const messages = [
      assistantMessage("msg-1", [
        toolPart("part-1", { status: "running", input: { command: COMMAND } }),
      ]),
    ];

    expect(pickCallBlock(shellRequest({ source: undefined }), messages)).toBeUndefined();
  });

  test("returns nothing when the source's message is missing from the session", () => {
    expect(pickCallBlock(shellRequest(), [])).toBeUndefined();
  });

  test("returns nothing when the message has no matching tool part", () => {
    const messages = [
      assistantMessage("msg-1", [
        toolPart("part-2", { status: "running", input: { command: COMMAND } }),
      ]),
    ];

    expect(pickCallBlock(shellRequest(), messages)).toBeUndefined();
  });

  test("returns nothing when the source's message is not an assistant message", () => {
    expect(pickCallBlock(shellRequest(), [{ id: "msg-1", type: "user" }])).toBeUndefined();
  });

  test("returns nothing when a running call's input has no command", () => {
    const messages = [
      assistantMessage("msg-1", [toolPart("part-1", { status: "running", input: {} })]),
    ];

    expect(pickCallBlock(shellRequest(), messages)).toBeUndefined();
  });

  test("returns nothing for a non-shell action", () => {
    const messages = [
      assistantMessage("msg-1", [
        toolPart("part-1", { status: "running", input: { command: COMMAND } }),
      ]),
    ];

    expect(pickCallBlock(shellRequest({ action: "edit" }), messages)).toBeUndefined();
  });
});
