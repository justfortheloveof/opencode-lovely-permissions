import { Plugin } from "opentui:runtime-module:%40opencode%2Fplugin%2Ftui";
import { jsx } from "opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime";
import { pickAskBannerMessage } from "./ask-banner.ts";

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup(context) {
    context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => {
        return jsx("text", {
          get children() {
            const asks = context.data.session.permission.list(sessionID) ?? [];
            return pickAskBannerMessage(asks.map(({ message }) => ({ message: message ?? "" })));
          },
        });
      },
    });
  },
});
