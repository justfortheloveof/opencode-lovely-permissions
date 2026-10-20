import type { Plugin } from "@opencode/plugin/tui";
import tuiPlugin from "../../src/tui.ts";

interface PendingPermission {
  readonly message?: string;
}

interface SessionInfo {
  readonly parentID?: string;
}

interface SlotInput {
  readonly sessionID: string;
}

interface RecordedSlot {
  readonly path: string;
  readonly render: (input: SlotInput) => unknown;
}

export interface TerminalPluginHarness {
  /** Slot paths the plugin registered. */
  readonly registered: string[];
  /** Session IDs requested from the fake permission data. */
  readonly permissionLookups: string[];
  /** Session IDs whose pending permissions were synced when the slot mounted. */
  readonly permissionSyncs: string[];
  /** Runs the registered composer-top slot with the host-provided input. */
  render(input: SlotInput): unknown;
}

interface SessionState {
  readonly sessionsByID?: Readonly<Record<string, SessionInfo>>;
  readonly familyBySession?: Readonly<Record<string, readonly string[]>>;
  readonly permissionsAfterSync?: Readonly<Record<string, readonly PendingPermission[]>>;
}

/** Runs the terminal plugin against fake pending permissions and records its slots. */
export async function startTerminalPlugin(
  permissionsBySession: Readonly<Record<string, readonly PendingPermission[]>>,
  sessionState: SessionState = {},
): Promise<TerminalPluginHarness> {
  const registered: string[] = [];
  const permissionLookups: string[] = [];
  const permissionSyncs: string[] = [];
  const slots: RecordedSlot[] = [];
  const currentPermissions: Record<string, readonly PendingPermission[]> = {
    ...permissionsBySession,
  };
  const sessionsByID = sessionState.sessionsByID ?? {};
  const familyBySession = sessionState.familyBySession ?? {};

  const context = {
    data: {
      session: {
        get(sessionID: string) {
          return sessionsByID[sessionID] ?? {};
        },
        family(sessionID: string) {
          return familyBySession[sessionID] ?? [sessionID];
        },
        permission: {
          list(sessionID: string) {
            permissionLookups.push(sessionID);
            return currentPermissions[sessionID];
          },
          sync(sessionID: string) {
            permissionSyncs.push(sessionID);
            const permissions = sessionState.permissionsAfterSync?.[sessionID];
            if (permissions !== undefined) currentPermissions[sessionID] = permissions;
            return Promise.resolve();
          },
        },
      },
    },
    ui: {
      slot(claim: {
        readonly [placement: string]: unknown;
        readonly render: (input: SlotInput) => unknown;
      }) {
        for (const placement of ["append", "prepend", "before", "after", "replace"]) {
          const path = claim[placement];
          if (typeof path === "string") {
            registered.push(path);
            slots.push({ path, render: claim.render });
          }
        }
        return () => {};
      },
    },
  } as unknown as Plugin.Context;

  await tuiPlugin.setup(context);

  return {
    registered,
    permissionLookups,
    permissionSyncs,
    render(input) {
      const slot = slots.find(({ path }) => path === "session.composer.top");
      if (slot === undefined) throw new Error("the plugin did not register session.composer.top");
      return slot.render(input);
    },
  };
}
