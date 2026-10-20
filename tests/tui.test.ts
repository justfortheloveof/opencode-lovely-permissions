import { describe, expect, test } from "vite-plus/test";
import { startTerminalPlugin } from "./support/fake-terminal-context.ts";

describe("terminal plugin", () => {
  test("registers the session composer-top slot and reads permissions for its session", async () => {
    const harness = await startTerminalPlugin({});

    harness.render({ sessionID: "ses_viewed" });

    expect(harness.registered).toContain("session.composer.top");
    expect(harness.permissionLookups).toEqual(["ses_viewed"]);
  });

  test("renders a branded ask using the rule's message verbatim", async () => {
    const message =
      "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- the command matches no allowed pattern";
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message }],
    });

    expect(harness.render({ sessionID: "ses_viewed" })).toEqual({
      type: "text",
      props: { children: message },
    });
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

    expect(harness.render({ sessionID: "ses_root" })).toEqual({
      type: "text",
      props: { children: message },
    });
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

    expect(harness.render({ sessionID: "ses_root" })).toEqual({
      type: "text",
      props: { children: ownMessage },
    });
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

    expect(harness.render({ sessionID: "ses_root" })).toEqual({
      type: "text",
      props: { children: firstMessage },
    });
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
  });
});
