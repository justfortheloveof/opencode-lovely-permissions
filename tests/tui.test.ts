import { describe, expect, test } from "vite-plus/test";
import { startTerminalPlugin } from "./support/fake-terminal-context.ts";

function renderedChildren(rendered: unknown): unknown {
  if (rendered === null || typeof rendered !== "object" || !("props" in rendered)) {
    return undefined;
  }

  const props = rendered.props;
  if (props === null || typeof props !== "object" || !("children" in props)) {
    return undefined;
  }

  return props.children;
}

describe("terminal plugin", () => {
  test("registers the session composer-top slot and reads permissions for its session", async () => {
    const harness = await startTerminalPlugin({});

    const banner = harness.render({ sessionID: "ses_viewed" });
    renderedChildren(banner);

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

  test("updates the banner as its pending ask is answered", async () => {
    const firstMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- first reason";
    const nextMessage = "[♡ perms: 💛 REQUIRES-USER-APPROVAL]\n- next reason";
    const pendingPermissions = {
      ses_viewed: [{ message: firstMessage }, { message: nextMessage }],
    };
    const harness = await startTerminalPlugin(pendingPermissions);
    const banner = harness.render({ sessionID: "ses_viewed" });

    expect(renderedChildren(banner)).toBe(firstMessage);

    pendingPermissions.ses_viewed.shift();
    expect(renderedChildren(banner)).toBe(nextMessage);

    pendingPermissions.ses_viewed.shift();
    expect(renderedChildren(banner)).toBeUndefined();
  });

  test("renders nothing when reading pending permissions throws", async () => {
    const permissionsBySession = Object.defineProperty({}, "ses_broken", {
      get() {
        throw new Error("permission data unavailable");
      },
    });
    const harness = await startTerminalPlugin(permissionsBySession);
    const banner = harness.render({ sessionID: "ses_broken" });

    expect(renderedChildren(banner)).toBeUndefined();
  });
});
