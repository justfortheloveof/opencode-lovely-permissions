import { describe, expect, test } from "bun:test";
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
});
