import { describe, expect, test } from "vite-plus/test";
import { commandFor } from "../src/command-capture.ts";
import { startPlugin } from "./support/fake-context.ts";

describe("command capture", () => {
  test("the command of a shell call is retrievable by call ID once the call starts", async () => {
    const harness = await startPlugin();
    await harness.startCall({
      tool: "shell",
      id: "call_retrievable",
      input: { command: "git status" },
    });
    expect(commandFor("call_retrievable")).toBe("git status");
  });

  test("the command is dropped when the call finishes", async () => {
    const harness = await startPlugin();
    const call = { tool: "shell", id: "call_finished", input: { command: "git status" } };
    await harness.startCall(call);
    await harness.finishCall(call);
    expect(commandFor("call_finished")).toBeUndefined();
  });

  test("concurrent calls are kept apart, so finishing one leaves the others", async () => {
    const harness = await startPlugin();
    const first = { tool: "shell", id: "call_apart_1", input: { command: "ls" } };
    const second = { tool: "shell", id: "call_apart_2", input: { command: "pwd" } };
    await harness.startCall(first);
    await harness.startCall(second);
    await harness.finishCall(first);
    expect(commandFor("call_apart_1")).toBeUndefined();
    expect(commandFor("call_apart_2")).toBe("pwd");
  });

  test("calls to tools other than shell are not recorded", async () => {
    const harness = await startPlugin();
    await harness.startCall({ tool: "read", id: "call_read", input: { filePath: "/etc/hosts" } });
    await harness.startCall({
      tool: "subagent",
      id: "call_subagent",
      input: { agent: "general", command: "git status" },
    });
    expect(commandFor("call_read")).toBeUndefined();
    expect(commandFor("call_subagent")).toBeUndefined();
  });

  test("the command is recorded as written, including pipes, && and redirections", async () => {
    const harness = await startPlugin();
    const command = "echo hi | cat > out.txt && true ";
    await harness.startCall({ tool: "shell", id: "call_as_written", input: { command } });
    expect(commandFor("call_as_written")).toBe(command);
  });

  test("a shell call with no command string is not recorded", async () => {
    const harness = await startPlugin();
    await harness.startCall({
      tool: "shell",
      id: "call_no_command",
      input: { cmd: "git status" },
    });
    expect(commandFor("call_no_command")).toBeUndefined();
  });
});
