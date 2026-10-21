import { describe, expect, test } from "bun:test";
import { startTerminalPlugin } from "../tests/support/fake-terminal-context.ts";

describe("terminal plugin", () => {
  test("registers the session composer-top slot and reads permissions for its session", async () => {
    const harness = await startTerminalPlugin({});

    harness.render({ sessionID: "ses_viewed" });

    expect(harness.registered).toContain("session.composer.top");
    expect(harness.permissionLookups).toEqual(["ses_viewed"]);
    expect(harness.permissionSyncs).toEqual(["ses_viewed"]);
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
    expect(harness.render({ sessionID: "ses_viewed" })).toBe(message);
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
      expect(harness.render({ sessionID: "ses_viewed" })).toBe(message);
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

    expect(harness.render({ sessionID: "ses_viewed" })).toBe(message);
  });

  test("updates the banner as its pending ask is answered", async () => {
    const firstMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- first reason";
    const nextMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- next reason";
    const pendingPermissions = {
      ses_viewed: [{ message: firstMessage }, { message: nextMessage }],
    };
    const harness = await startTerminalPlugin(pendingPermissions);
    expect(harness.render({ sessionID: "ses_viewed" })).toBe(firstMessage);

    pendingPermissions.ses_viewed.shift();
    expect(harness.render({ sessionID: "ses_viewed" })).toBe(nextMessage);

    pendingPermissions.ses_viewed.shift();
    expect(harness.render({ sessionID: "ses_viewed" })).toBeUndefined();
  });

  test("renders nothing when reading pending permissions throws", async () => {
    const permissionsBySession = Object.defineProperty({}, "ses_broken", {
      get() {
        throw new Error("permission data unavailable");
      },
    });
    const harness = await startTerminalPlugin(permissionsBySession);
    expect(harness.render({ sessionID: "ses_broken" })).toBeUndefined();
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

    expect(harness.render({ sessionID: "ses_root" })).toBe(message);
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

    expect(harness.render({ sessionID: "ses_root" })).toBe(ownMessage);
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

    expect(harness.render({ sessionID: "ses_root" })).toBe(firstMessage);
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

    expect(harness.render({ sessionID: "ses_child" })).toBeNull();
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
