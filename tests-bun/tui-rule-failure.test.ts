import { describe, expect, mock, test } from "bun:test";
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
    const rendered = harness.render({ sessionID: "ses_viewed" });

    expect(rendered).toBeUndefined();
  });
});
