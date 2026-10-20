import { describe, expect, test } from "vite-plus/test";
import { startTerminalPlugin } from "./support/fake-terminal-context.ts";

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
        sessionFamilies: { ses_viewed: ["ses_viewed", "ses_child"] },
        permissionsAfterSync: { ses_viewed: [{ message }] },
      },
    );

    expect(harness.permissionSyncs).toEqual([]);
    expect(harness.render({ sessionID: "ses_viewed" })).toEqual({
      type: "text",
      props: { children: message },
    });
    expect(harness.permissionSyncs).toEqual(["ses_viewed", "ses_child"]);
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
});
