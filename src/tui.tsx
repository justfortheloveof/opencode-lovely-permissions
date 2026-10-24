import { Plugin } from "@opencode/plugin/tui";
import { onMount } from "solid-js";
import { pickAskBannerMessage } from "./ask-banner.ts";
import { MODE_RPC } from "./mode-rpc.ts";

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
    context.keymap.layer(() => ({
      commands: [
        {
          id: "lovely-permissions-cfg",
          title: "Switch lovely permissions Mode",
          description: "Temporarily switch the bash permissions Mode for this location",
          slash: { name: "lovely-permissions-cfg" },
          run: async () => {
            const route = context.ui.router.current();
            if (route.type !== "session") return;

            const location =
              context.data.session.get(route.sessionID)?.location ?? context.location;
            const modes = context.client.rpc(MODE_RPC);
            const loaded = await modes.listModes({}, { location });
            if (loaded.status === "invalid") {
              await context.ui.dialog.alert({
                title: "Lovely permissions Mode",
                message: "Configuration invalid",
              });
              return;
            }
            if (loaded.status === "absent" || loaded.modes.length === 0) {
              context.ui.dialog.show(() => (
                <box
                  title="Lovely permissions Mode"
                  border
                  borderStyle="rounded"
                  padding={1}
                  flexDirection="column"
                  gap={1}
                >
                  <text>No modes configured.</text>
                  <text>esc to close</text>
                </box>
              ));
              return;
            }

            const selected = await context.ui.dialog.select({
              title: "Lovely permissions Mode",
              options: loaded.modes.map((mode) => ({ title: mode, value: mode })),
              current: loaded.activeMode,
            });
            if (selected === undefined) return;

            const result = await modes.setMode({ mode: selected }, { location });
            if (result.status === "invalid-policy") {
              await context.ui.dialog.alert({
                title: "Lovely permissions Mode",
                message: `Configuration invalid for mode ${selected}.`,
              });
            }
          },
        },
      ],
    }));

    return context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => <AskBannerSlot context={context} sessionID={sessionID} />,
    });
  },
});
