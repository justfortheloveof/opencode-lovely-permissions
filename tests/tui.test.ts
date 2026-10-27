import { describe, expect, test } from "bun:test";
import { CodeRenderable, TextRenderable, type Renderable } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import type { PermissionSource, SessionMessageAssistant } from "@opencode/client";
import { startTerminalPlugin } from "./support/fake-terminal-context.ts";
import { withTestRender } from "./support/test-render.ts";
import type { ModeList } from "../src/mode-rpc.ts";

function visibleText(frame: string): string {
  return frame
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

async function visibleFrame(
  harness: Awaited<ReturnType<typeof startTerminalPlugin>>,
  sessionID: string,
): Promise<string> {
  return withTestRender(
    () => harness.render({ sessionID }),
    (setup) => visibleText(setup.captureCharFrame()),
  );
}

/** The source the test asks use: the bash tool part of `msg_bash`. */
const shellSource: PermissionSource = { type: "tool", messageID: "msg_bash", id: "part_bash" };

/** An assistant message whose single part is a running bash tool call with the given command. */
function shellMessage(command: string): SessionMessageAssistant {
  return {
    id: "msg_bash",
    time: { created: 0 },
    type: "assistant",
    agent: "agent_test",
    model: { id: "model_test", providerID: "provider_test" },
    content: [
      {
        type: "tool",
        id: "part_bash",
        name: "bash",
        state: { status: "running", input: { command }, metadata: {} },
        time: { created: 0 },
      },
    ],
  };
}

/** An assistant message with only a text part, so a source pointing at it matches no tool. */
function textMessage(): SessionMessageAssistant {
  return {
    id: "msg_text",
    time: { created: 0 },
    type: "assistant",
    agent: "agent_test",
    model: { id: "model_test", providerID: "provider_test" },
    content: [{ type: "text", text: "no tool part" }],
  };
}

/** The renderables of one type in the tree, for reaching the block's element and scroll state. */
function findRenderables<T extends Renderable>(
  node: Renderable,
  type: new (...args: never[]) => T,
): T[] {
  const found: T[] = node instanceof type ? [node] : [];
  for (const child of node.getChildren()) found.push(...findRenderables(child, type));
  return found;
}

describe("terminal plugin", () => {
  test("registers the session composer-top slot and reads permissions for its session", async () => {
    const harness = await startTerminalPlugin({});

    await withTestRender(
      () => harness.render({ sessionID: "ses_viewed" }),
      (setup) => {
        expect(setup.captureCharFrame()).not.toContain("REQUIRES-USER-APPROVAL");
      },
    );

    expect(harness.registered).toContain("session.composer.top");
    expect(harness.permissionLookups).toEqual(["ses_viewed"]);
    expect(harness.permissionSyncs).toEqual(["ses_viewed"]);
  });

  test("opens the loaded Mode picker and applies the selected Mode for the session location", async () => {
    const modeList: ModeList = {
      status: "ready",
      modes: ["default", "strict"],
      activeMode: "default",
    };
    const harness = await startTerminalPlugin(
      {},
      {
        modeList,
        selectedMode: "strict",
        sessionsByID: { ses_viewed: { location: { directory: "/project" } } },
      },
    );

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.slashCommands).toContain("lovely-permissions-cfg");
    expect(harness.keymapLayerModes).toEqual(["global"]);
    expect(harness.pickerRequests).toHaveLength(1);
    expect(harness.pickerRequests[0]).toMatchObject({
      current: "default",
      options: [
        { title: "default", value: "default" },
        { title: "strict", value: "strict" },
      ],
    });
    expect(harness.modeListLocations).toEqual([{ directory: "/project" }]);
    expect(harness.modeChanges).toEqual([{ mode: "strict", location: { directory: "/project" } }]);
    expect(harness.toasts).toEqual([]);
  });

  test("opens the Mode picker from the home route using the current location", async () => {
    const harness = await startTerminalPlugin(
      {},
      {
        modeList: { status: "ready", modes: ["default", "strict"], activeMode: "default" },
        route: { type: "home" },
      },
    );

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.pickerRequests).toHaveLength(1);
    expect(harness.modeListLocations).toEqual([{ directory: "/current" }]);
  });

  test("cancelling the Mode picker leaves the server unchanged", async () => {
    const harness = await startTerminalPlugin(
      {},
      {
        modeList: { status: "ready", modes: ["default", "strict"], activeMode: "default" },
      },
    );

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.pickerRequests).toHaveLength(1);
    expect(harness.modeChanges).toEqual([]);
  });

  test("shows a picker-style empty state when no Modes are configured", async () => {
    const harness = await startTerminalPlugin({}, { modeList: { status: "absent" } });

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.customDialogs).toHaveLength(1);
    const frame = await withTestRender(harness.customDialogs[0]!, (setup) =>
      visibleText(setup.captureCharFrame()),
    );
    expect(frame).toContain("No modes configured.");
    expect(frame).toContain("Lovely permissions Mode");
    expect(harness.alertRequests).toEqual([]);
    expect(harness.pickerRequests).toEqual([]);
    expect(harness.modeChanges).toEqual([]);
    expect(harness.toasts).toEqual([]);
  });

  test("shows an invalid-configuration modal instead of an empty state", async () => {
    const harness = await startTerminalPlugin({}, { modeList: { status: "invalid" } });

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.alertRequests).toEqual([
      { title: "Lovely permissions Mode", message: "Configuration invalid" },
    ]);
    expect(harness.pickerRequests).toEqual([]);
    expect(harness.modeChanges).toEqual([]);
  });

  test("explains when the selected Mode has an invalid Policy", async () => {
    const harness = await startTerminalPlugin(
      {},
      {
        modeList: { status: "ready", modes: ["default", "strict"], activeMode: "default" },
        selectedMode: "strict",
        setModeResult: { status: "invalid-policy", mode: "strict" },
      },
    );

    await harness.runCommand("lovely-permissions-cfg");

    expect(harness.modeChanges).toEqual([{ mode: "strict", location: { directory: "/current" } }]);
    expect(harness.alertRequests).toEqual([
      {
        title: "Lovely permissions Mode",
        message: "Configuration invalid for mode strict.",
      },
    ]);
    expect(harness.toasts).toEqual([]);
  });

  test("syncs the viewed session and its family on mount before displaying its pending ask", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- synced ask reason";
    const harness = await startTerminalPlugin(
      { ses_viewed: [], ses_child: [] },
      {
        familyBySession: { ses_viewed: ["ses_viewed", "ses_child"] },
        permissionsAfterSync: { ses_viewed: [{ message }] },
      },
    );

    expect(harness.permissionSyncs).toEqual([]);
    expect(await visibleFrame(harness, "ses_viewed")).toContain(message);
    expect(harness.permissionSyncs).toEqual(["ses_viewed", "ses_child"]);
  });

  test("keeps the banner visible and suppresses unhandled sync failures", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- sync failure ask";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ message }] },
      { syncFailure: new Error("permission sync unavailable") },
    );
    const unhandledErrors: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledErrors.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      expect(await visibleFrame(harness, "ses_viewed")).toContain(message);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandledErrors).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  test("renders a branded ask using the rule's message verbatim", async () => {
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message }],
    });

    expect(await visibleFrame(harness, "ses_viewed")).toContain(message);
  });

  test("shows the no-Modes reason and missing policy locations in the pending ask banner", async () => {
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n" +
      "- No modes configured; defaulting to ask.\n" +
      "- no global policy file at /home/user/.config/opencode/lovely-permissions.jsonc\n" +
      "- no project policy file at /project/.opencode/lovely-permissions.jsonc\n" +
      "- no local policy file at /project/.opencode/lovely-permissions.local.jsonc";
    const harness = await startTerminalPlugin({ ses_viewed: [{ message }] });

    expect(await visibleFrame(harness, "ses_viewed")).toContain(message);
  });

  test("does not show unbranded or reasonless pending asks", async () => {
    for (const message of [
      "[another tool]\n- another tool's reason",
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
    ]) {
      const harness = await startTerminalPlugin({ ses_viewed: [{ message }] });

      const frame = await visibleFrame(harness, "ses_viewed");

      expect(frame).not.toContain("REQUIRES-USER-APPROVAL");
      expect(frame).not.toContain("another tool's reason");
    }
  });

  test("updates the banner as its pending ask is answered", async () => {
    const firstMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- first reason";
    const nextMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- next reason";
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message: firstMessage }, { message: nextMessage }],
    });
    await withTestRender(
      () => harness.render({ sessionID: "ses_viewed" }),
      async (setup) => {
        expect(visibleText(setup.captureCharFrame())).toContain(firstMessage);

        harness.setPermissions("ses_viewed", [{ message: nextMessage }]);
        const nextFrame = await setup.waitForFrame((frame) =>
          visibleText(frame).includes(nextMessage),
        );
        expect(visibleText(nextFrame)).not.toContain(firstMessage);

        harness.setPermissions("ses_viewed", []);
        const emptyFrame = await setup.waitForFrame(
          (frame) => !visibleText(frame).includes(nextMessage),
        );
        expect(visibleText(emptyFrame)).not.toContain(nextMessage);
      },
    );
  });

  test("renders nothing when reading pending permissions throws", async () => {
    const permissionsBySession = Object.defineProperty({}, "ses_broken", {
      get() {
        throw new Error("permission data unavailable");
      },
    });
    const harness = await startTerminalPlugin(permissionsBySession);
    expect(await visibleFrame(harness, "ses_broken")).not.toContain("REQUIRES-USER-APPROVAL");
  });

  test("renders a subagent ask in the root session's banner", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- subagent command needs approval";
    const harness = await startTerminalPlugin(
      {
        ses_root: [],
        ses_child: [{ message }],
      },
      {
        sessionsByID: {
          ses_root: {},
          ses_child: { parentID: "ses_root" },
        },
        familyBySession: {
          ses_root: ["ses_root", "ses_child"],
        },
      },
    );

    expect(await visibleFrame(harness, "ses_root")).toContain(message);
    expect(harness.permissionLookups).toEqual(["ses_root", "ses_child"]);
  });

  test("puts the viewed session's ask before its subagent asks", async () => {
    const ownMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- root command needs approval";
    const childMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- child command needs approval";
    const harness = await startTerminalPlugin(
      {
        ses_root: [{ message: ownMessage }],
        ses_child: [{ message: childMessage }],
      },
      {
        sessionsByID: {
          ses_root: {},
          ses_child: { parentID: "ses_root" },
        },
        familyBySession: {
          ses_root: ["ses_child", "ses_root"],
        },
      },
    );

    const frame = await visibleFrame(harness, "ses_root");
    expect(frame).toContain(ownMessage);
    expect(frame).not.toContain(childMessage);
    expect(harness.permissionLookups).toEqual(["ses_root", "ses_child"]);
  });

  test("uses family order for subagent asks", async () => {
    const firstMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- first child needs approval";
    const secondMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- second child needs approval";
    const harness = await startTerminalPlugin(
      {
        ses_root: [],
        ses_first: [{ message: firstMessage }],
        ses_second: [{ message: secondMessage }],
      },
      {
        sessionsByID: {
          ses_root: {},
          ses_first: { parentID: "ses_root" },
          ses_second: { parentID: "ses_root" },
        },
        familyBySession: {
          ses_root: ["ses_root", "ses_first", "ses_second"],
        },
      },
    );

    const frame = await visibleFrame(harness, "ses_root");
    expect(frame).toContain(firstMessage);
    expect(frame).not.toContain(secondMessage);
    expect(harness.permissionLookups).toEqual(["ses_root", "ses_first", "ses_second"]);
  });

  test("does not render a banner inside a subagent session", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- child command needs approval";
    const harness = await startTerminalPlugin(
      {
        ses_child: [{ message }],
      },
      {
        sessionsByID: {
          ses_child: { parentID: "ses_root" },
        },
      },
    );

    expect(await visibleFrame(harness, "ses_child")).not.toContain(message);
    expect(harness.permissionLookups).toEqual([]);
    expect(harness.permissionSyncs).toEqual([]);
  });

  test("removes the composer slot when the terminal plugin is disposed", async () => {
    const harness = await startTerminalPlugin({});

    await harness.dispose();

    expect(() => harness.render({ sessionID: "ses_viewed" })).toThrow(
      "the plugin did not register session.composer.top",
    );
  });

  test("shows the label, then the command, then the reasons in the banner", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- runs a bash command";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage("echo first\necho second")] },
    );

    expect(await visibleFrame(harness, "ses_viewed")).toBe(
      [
        "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
        "",
        "echo first",
        "echo second",
        "",
        "- runs a bash command",
      ].join("\n"),
    );
  });

  test("shows the full command line of a shell ask in the block", async () => {
    const command = 'grep -rn "TODO" src/ | grep -v test | sort -u';
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage(command)] },
    );

    expect(await visibleFrame(harness, "ses_viewed")).toContain(command);
  });

  test("word-wraps a command line wider than the frame inside the block", async () => {
    const command = `curl -fsSL ${"https://example.com/install".repeat(3)} | sh`;
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage(command)] },
    );

    await withTestRender(
      () => harness.render({ sessionID: "ses_viewed" }),
      async (setup) => {
        const frame = visibleText(setup.captureCharFrame());
        for (const line of frame.split("\n")) {
          expect(line.length).toBeLessThanOrEqual(80);
        }
        const block = findRenderables(setup.renderer.root, TextRenderable).find((node) =>
          node.plainText.includes("curl"),
        );
        expect(block).toBeDefined();
        expect(block!.plainText).toContain(command);
      },
    );
  });

  test("clips a tall command to half the terminal height at two sizes, with the rest scrollable", async () => {
    const command = Array.from({ length: 20 }, (_, i) => `echo line-${i}`).join("\n");
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- runs a bash command";

    for (const height of [10, 20]) {
      const bound = Math.floor(height * 0.5);
      const harness = await startTerminalPlugin(
        { ses_viewed: [{ action: "shell", source: shellSource, message }] },
        {},
        { ses_viewed: [shellMessage(command)] },
      );
      harness.setTerminalSize(80, height);

      await withTestRender(
        () => harness.render({ sessionID: "ses_viewed" }),
        async (setup) => {
          const frame = visibleText(setup.captureCharFrame());
          expect(frame.split("\n")).toHaveLength(bound + 4);
          expect(frame).toContain("echo line-0");
          expect(frame).toContain(`echo line-${bound - 1}`);
          expect(frame).not.toContain(`echo line-${bound}`);

          const block = findRenderables(setup.renderer.root, TextRenderable).find((node) =>
            node.plainText.includes("echo line-0"),
          );
          expect(block).toBeDefined();
          block!.scrollY = block!.maxScrollY;
          await setup.renderOnce();
          const scrolled = visibleText(setup.captureCharFrame());
          expect(scrolled).toContain(`echo line-${command.split("\n").length - 1}`);
          expect(scrolled).not.toContain("echo line-0");
        },
        { width: 80, height },
      );
    }
  });

  test("gives a short command only the lines it needs", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- runs a bash command";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage("echo short")] },
    );

    expect(await visibleFrame(harness, "ses_viewed")).toBe(
      ["[♡ perms: 💛 REQUIRES-USER-APPROVAL]", "", "echo short", "", "- runs a bash command"].join(
        "\n",
      ),
    );
  });

  test("renders the same frame when the theme has no syntax colors", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- runs a bash command";
    const styled = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage("echo unstyled")] },
    );
    const unstyled = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage("echo unstyled")] },
    );
    unstyled.setTheme({ syntax: {} });

    expect(await visibleFrame(unstyled, "ses_viewed")).toBe(
      await visibleFrame(styled, "ses_viewed"),
    );
  });

  test("matches today's banner exactly when the derivation yields nothing", async () => {
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const cases: Array<{
      readonly ask: {
        readonly action?: string;
        readonly source?: PermissionSource;
        readonly message?: string;
      };
      readonly messages: readonly SessionMessageAssistant[];
    }> = [
      // A sourceless ask cannot be recovered.
      { ask: { action: "shell", message }, messages: [shellMessage("echo hidden")] },
      // A source, but for an action with no call block.
      {
        ask: { action: "edit", source: shellSource, message },
        messages: [shellMessage("echo hidden")],
      },
      // A source whose message is missing.
      { ask: { action: "shell", source: shellSource, message }, messages: [] },
      // A source whose message has no matching tool part.
      { ask: { action: "shell", source: shellSource, message }, messages: [textMessage()] },
    ];

    for (const { ask, messages } of cases) {
      const harness = await startTerminalPlugin(
        { ses_viewed: [ask] },
        {},
        { ses_viewed: messages },
      );
      expect(await visibleFrame(harness, "ses_viewed")).toBe(message);
    }
  });

  test("re-derives the block when the chosen ask changes", async () => {
    const firstMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- first reason";
    const nextMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- next reason";
    const next = { action: "shell", source: shellSource, message: nextMessage };
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ message: firstMessage }, next] },
      {},
      { ses_viewed: [shellMessage("echo next")] },
    );

    await withTestRender(
      () => harness.render({ sessionID: "ses_viewed" }),
      async (setup) => {
        expect(visibleText(setup.captureCharFrame())).toBe(firstMessage);

        harness.setPermissions("ses_viewed", [next]);
        const frame = await setup.waitForFrame((candidate) =>
          visibleText(candidate).includes("echo next"),
        );
        expect(visibleText(frame)).toBe(
          ["[♡ perms: 💛 REQUIRES-USER-APPROVAL]", "", "echo next", "", "- next reason"].join("\n"),
        );
      },
    );
  });

  test("syncs the viewed session's messages with the family on mount", async () => {
    const harness = await startTerminalPlugin(
      { ses_viewed: [], ses_child: [] },
      { familyBySession: { ses_viewed: ["ses_viewed", "ses_child"] } },
    );

    await visibleFrame(harness, "ses_viewed");

    expect(harness.permissionSyncs).toEqual(["ses_viewed", "ses_child"]);
    expect(harness.messageSyncs).toEqual(["ses_viewed", "ses_child"]);
  });

  test("keeps the banner visible and suppresses unhandled message sync failures", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- message sync failure ask";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ message }] },
      { messageSyncFailure: new Error("message sync unavailable") },
    );
    const unhandledErrors: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandledErrors.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      expect(await visibleFrame(harness, "ses_viewed")).toContain(message);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandledErrors).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  test("fills the block in when a message arrives after the banner has rendered", async () => {
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [] },
    );

    await withTestRender(
      () => harness.render({ sessionID: "ses_viewed" }),
      async (setup) => {
        // Without the message the derivation yields nothing: today's label-and-reasons banner.
        expect(visibleText(setup.captureCharFrame())).toBe(message);

        harness.setMessages("ses_viewed", [shellMessage("echo late")]);
        const frame = await setup.waitForFrame((candidate) =>
          visibleText(candidate).includes("echo late"),
        );
        expect(visibleText(frame)).toBe(
          [
            "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
            "",
            "echo late",
            "",
            "- the command matches no allowed pattern",
          ].join("\n"),
        );
      },
    );
  });

  test("shows a subagent ask's call block in the parent's banner from the family session's messages", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- subagent command needs approval";
    const harness = await startTerminalPlugin(
      {
        ses_root: [],
        ses_child: [{ action: "shell", source: shellSource, message }],
      },
      {
        sessionsByID: {
          ses_root: {},
          ses_child: { parentID: "ses_root" },
        },
        familyBySession: {
          ses_root: ["ses_root", "ses_child"],
        },
      },
      { ses_child: [shellMessage("echo subagent")] },
    );

    expect(await visibleFrame(harness, "ses_root")).toBe(
      [
        "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
        "",
        "echo subagent",
        "",
        "- subagent command needs approval",
      ].join("\n"),
    );
  });

  test("draws the call block as a code element once the host's syntax style is available", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- runs a bash command";
    const harness = await startTerminalPlugin(
      { ses_viewed: [{ action: "shell", source: shellSource, message }] },
      {},
      { ses_viewed: [shellMessage("echo styled")] },
    );

    await withTestRender(
      () => {
        harness.setNativeScene(useRenderer().nativeScene);
        return harness.render({ sessionID: "ses_viewed" });
      },
      async (setup) => {
        // The style class loads after mount, so the block switches from text to code a moment later.
        let blocks: CodeRenderable[] = [];
        for (let attempt = 0; attempt < 100 && blocks.length === 0; attempt++) {
          await setup.renderOnce();
          blocks = findRenderables(setup.renderer.root, CodeRenderable);
          if (blocks.length === 0) await new Promise((resolve) => setTimeout(resolve, 10));
        }

        expect(blocks).toHaveLength(1);
        expect(blocks[0]!.plainText).toBe("echo styled");
        expect(visibleText(setup.captureCharFrame())).toBe(
          [
            "[♡ perms: 💛 REQUIRES-USER-APPROVAL]",
            "",
            "echo styled",
            "",
            "- runs a bash command",
          ].join("\n"),
        );
      },
    );
  });
});
