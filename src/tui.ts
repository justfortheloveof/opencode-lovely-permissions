import { Plugin } from "opentui:runtime-module:%40opencode%2Fplugin%2Ftui";
import { jsx } from "opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime";
import { onMount } from "opentui:runtime-module:solid-js";
import { pickAskBannerMessage } from "./ask-banner.ts";

function AskBannerSlot(context: Plugin.Context, sessionID: string) {
  try {
    const familySessionIDs = context.data.session.family(sessionID);
    onMount(() => {
      const sessionIDs = new Set([sessionID, ...familySessionIDs]);
      void Promise.all(
        [...sessionIDs].map((familySessionID) =>
          context.data.session.permission.sync(familySessionID),
        ),
      );
    });

    if (context.data.session.get(sessionID)?.parentID) return null;

    const asks = [
      ...(context.data.session.permission.list(sessionID) ?? []),
      ...familySessionIDs
        .filter((familySessionID) => familySessionID !== sessionID)
        .flatMap((familySessionID) => context.data.session.permission.list(familySessionID) ?? []),
    ];
    const message = pickAskBannerMessage(asks.map(({ message }) => ({ message: message ?? "" })));
    return message === undefined ? null : jsx("text", { children: message });
  } catch {
    return null;
  }
}

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup(context) {
    context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => jsx(() => AskBannerSlot(context, sessionID), {}),
    });
  },
});
