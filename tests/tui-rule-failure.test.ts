import { describe, expect, test, vi } from "vite-plus/test";
import { ASK_LABEL } from "../src/labels.ts";

vi.mock("../src/ask-banner.ts", () => ({
  pickAskBannerMessage() {
    throw new Error("banner rule failed");
  },
}));

import { startTerminalPlugin } from "./support/fake-terminal-context.ts";

describe("terminal plugin failures", () => {
  test("renders nothing when the banner rule throws", async () => {
    const harness = await startTerminalPlugin({
      ses_viewed: [{ message: `${ASK_LABEL}\n- a reason` }],
    });
    let rendered: unknown;

    expect(() => {
      rendered = harness.render({ sessionID: "ses_viewed" });
    }).not.toThrow();
    expect(rendered).toBeNull();
  });
});
