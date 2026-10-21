import { describe, expect, test } from "bun:test";
import { startTerminalPlugin } from "../tests/support/fake-terminal-context.ts";

describe("terminal plugin under Bun", () => {
  test("renders the branded ask reason verbatim", async () => {
    const message = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- command needs approval";
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message }],
    });

    expect(harness.render({ sessionID: "ses_viewed" })).toBe(message);
  });
});
