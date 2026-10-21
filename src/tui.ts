import { Plugin } from "@opencode/plugin/tui";
import { jsx } from "@opentui/solid/jsx-runtime";
import { onMount } from "solid-js";
import { pickAskBannerMessage } from "./ask-banner.ts";

function pendingPermissions(context: Plugin.Context, sessionID: string) {
  return context.data.session.permission.list(sessionID) ?? [];
}

function AskBannerSlot(context: Plugin.Context, sessionID: string) {
  try {
    if (context.data.session.get(sessionID)?.parentID) return null;

    const familySessionIDs = context.data.session.family(sessionID);
    onMount(() => {
      const sessionIDs = new Set([sessionID, ...familySessionIDs]);
      void Promise.all(
        [...sessionIDs].map((familySessionID) =>
          context.data.session.permission.sync(familySessionID),
        ),
      ).catch(() => {});
    });

    return jsx("text", {
      get children() {
        try {
          const asks = [
            ...pendingPermissions(context, sessionID),
            ...familySessionIDs
              .filter((familySessionID) => familySessionID !== sessionID)
              .flatMap((familySessionID) => pendingPermissions(context, familySessionID)),
          ];
          return pickAskBannerMessage(asks.map(({ message }) => ({ message: message ?? "" })));
        } catch {
          return undefined;
        }
      },
    });
  } catch {
    return null;
  }
}

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup(context) {
    return context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => jsx(() => AskBannerSlot(context, sessionID), {}),
    });
  },
});
