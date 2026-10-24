import { describe, expect, test } from "bun:test";
import { ASK_LABEL } from "../src/labels.ts";
import { pickAskBannerMessage } from "../src/ask-banner.ts";

describe("ask banner rule", () => {
  test("returns the branded ask message verbatim when it has a reason", () => {
    const message = `${ASK_LABEL}\n- the command matches no allowed pattern\n- it writes to a file`;

    expect(pickAskBannerMessage([{ message }])).toBe(message);
  });

  test("returns nothing when there are no pending asks", () => {
    expect(pickAskBannerMessage([])).toBeUndefined();
  });

  test("returns nothing when the pending ask does not have the ask brand label", () => {
    expect(pickAskBannerMessage([{ message: "[other plugin]\n- ask reason" }])).toBeUndefined();
  });

  test("returns nothing when the first ask is unbranded, even if a later ask is branded", () => {
    const laterMessage = `${ASK_LABEL}\n- the command matches no allowed pattern`;

    expect(
      pickAskBannerMessage([
        { message: "[other plugin]\n- other plugin's reason" },
        { message: laterMessage },
      ]),
    ).toBeUndefined();
  });

  test("returns nothing when the ask message contains only the brand label", () => {
    expect(pickAskBannerMessage([{ message: ASK_LABEL }])).toBeUndefined();
  });

  test("returns the missing-policy ask with all three locations", () => {
    const message =
      `${ASK_LABEL}\n` +
      "- No modes configured; defaulting to ask.\n" +
      "- no global policy file at /home/user/.config/opencode/lovely-permissions.json\n" +
      "- no project policy file at .opencode/lovely-permissions.json\n" +
      "- no local policy file at .opencode/lovely-permissions.local.json";

    expect(pickAskBannerMessage([{ message }])).toBe(message);
  });
});
