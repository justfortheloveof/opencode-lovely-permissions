import { describe, expect, test } from "bun:test";
import { ASK_LABEL } from "../src/labels.ts";
import { pickAskBannerMessage } from "../src/ask-banner.ts";

const ECHO_REASON = '"echo" command does not match allowed patterns; wildcard policy is ask';
const NPM_REASON = '"npm" command does not match allowed patterns; wildcard policy is ask';
const RM_REASON = '"rm" command does not match allowed patterns; wildcard policy is ask';

describe("ask banner rule", () => {
  test("returns the branded ask message verbatim when it has a reason", () => {
    const message = `${ASK_LABEL}\n- output redirection requires approval\n- ${ECHO_REASON}`;

    expect(pickAskBannerMessage([{ message }])).toBe(message);
  });

  test("returns nothing when there are no pending asks", () => {
    expect(pickAskBannerMessage([])).toBeUndefined();
  });

  test("returns nothing when the pending ask does not have the ask brand label", () => {
    expect(pickAskBannerMessage([{ message: `[other plugin]\n- ${NPM_REASON}` }])).toBeUndefined();
  });

  test("returns nothing when the first ask is unbranded, even if a later ask is branded", () => {
    const laterMessage = `${ASK_LABEL}\n- ${RM_REASON}`;

    expect(
      pickAskBannerMessage([
        { message: `[other plugin]\n- ${NPM_REASON}` },
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
      "- no global policy file at /home/dev/.config/opencode/lovely-permissions.jsonc\n" +
      "- no project policy file at /home/dev/app/.opencode/lovely-permissions.jsonc\n" +
      "- no local policy file at /home/dev/app/.opencode/lovely-permissions.local.jsonc";

    expect(pickAskBannerMessage([{ message }])).toBe(message);
  });
});
