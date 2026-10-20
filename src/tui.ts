import { Plugin } from "opentui:runtime-module:%40opencode%2Fplugin%2Ftui";
import { jsx } from "opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime";
import { pickAskBannerMessage } from "./ask-banner.ts";

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup(context) {
    context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => {
        try {
          if (context.data.session.get(sessionID)?.parentID) return null;

          return jsx("text", {
            get children() {
              try {
                const asks = [
                  ...(context.data.session.permission.list(sessionID) ?? []),
                  ...context.data.session
                    .family(sessionID)
                    .filter((familySessionID) => familySessionID !== sessionID)
                    .flatMap(
                      (familySessionID) =>
                        context.data.session.permission.list(familySessionID) ?? [],
                    ),
                ];
                return pickAskBannerMessage(
                  asks.map(({ message }) => ({ message: message ?? "" })),
                );
              } catch {
                return undefined;
              }
            },
          });
        } catch {
          return null;
        }
      },
    });
  },
});
