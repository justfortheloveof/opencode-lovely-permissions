import { Plugin } from "@opencode/plugin/tui";
import { onMount } from "solid-js";
import { pickAskBannerMessage } from "./ask-banner.ts";

interface AskBannerProps {
  readonly context: Plugin.Context;
  readonly sessionID: string;
}

function pendingPermissions(context: Plugin.Context, sessionID: string) {
  return context.data.session.permission.list(sessionID) ?? [];
}

function AskBannerSlot(props: AskBannerProps) {
  try {
    if (props.context.data.session.get(props.sessionID)?.parentID) return null;

    const familySessionIDs = props.context.data.session.family(props.sessionID);
    onMount(() => {
      const sessionIDs = new Set([props.sessionID, ...familySessionIDs]);
      void Promise.all(
        [...sessionIDs].map((familySessionID) =>
          props.context.data.session.permission.sync(familySessionID),
        ),
      ).catch(() => {});
    });

    return (
      <text>
        {() => {
          try {
            const asks = [
              ...pendingPermissions(props.context, props.sessionID),
              ...familySessionIDs
                .filter((familySessionID) => familySessionID !== props.sessionID)
                .flatMap((familySessionID) => pendingPermissions(props.context, familySessionID)),
            ];
            return pickAskBannerMessage(asks.map(({ message }) => ({ message: message ?? "" })));
          } catch {
            return undefined;
          }
        }}
      </text>
    );
  } catch {
    return null;
  }
}

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup(context) {
    return context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => <AskBannerSlot context={context} sessionID={sessionID} />,
    });
  },
});
