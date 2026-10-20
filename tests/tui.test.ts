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

  test("renders nothing when reading pending permissions throws", async () => {
    const permissionsBySession = Object.defineProperty({}, "ses_broken", {
      get() {
        throw new Error("permission data unavailable");
      },
    });
    const harness = await startTerminalPlugin(permissionsBySession);

    expect(harness.render({ sessionID: "ses_broken" })).toBeNull();
  });
});
