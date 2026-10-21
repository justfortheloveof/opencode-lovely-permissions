import { describe, expect, mock, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { ASK_LABEL } from "../src/labels.ts";

// Register the module mock before loading the plugin graph; Bun does not rely on Vitest mock hoisting.
void mock.module("../src/ask-banner.ts", () => ({
  pickAskBannerMessage() {
    throw new Error("banner rule failed");
  },
}));

describe("terminal plugin failures", () => {
  test("renders nothing when the banner rule throws", async () => {
    const { startTerminalPlugin } = await import("../tests/support/fake-terminal-context.ts");
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message: `${ASK_LABEL}\n- a reason` }],
    });
    const setup = await testRender(() => harness.render({ sessionID: "ses_viewed" }), {
      width: 80,
      height: 6,
    });

    try {
      await setup.renderOnce();
      expect(setup.captureCharFrame()).not.toContain("REQUIRES-USER-APPROVAL");
    } finally {
      await setup.dispose();
    }
  });
});
