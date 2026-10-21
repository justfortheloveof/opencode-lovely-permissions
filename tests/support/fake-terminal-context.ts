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

interface SlotClaim {
  readonly append: "session.composer.top";
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
  /** Runs the terminal plugin's cleanup hook. */
  dispose(): Promise<void>;
}

interface SessionState {
  readonly sessionsByID?: Readonly<Record<string, SessionInfo>>;
  readonly familyBySession?: Readonly<Record<string, readonly string[]>>;
  readonly permissionsAfterSync?: Readonly<Record<string, readonly PendingPermission[]>>;
  readonly syncFailure?: Error;
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
            if (sessionState.syncFailure !== undefined) {
              return Promise.reject(sessionState.syncFailure);
            }
            return Promise.resolve();
          },
        },
      },
    },
    ui: {
      slot(claim: SlotClaim) {
        registered.push(claim.append);
        slots.push({ path: claim.append, render: claim.render });
        return () => {
          const index = slots.findIndex(
            ({ path, render }) => path === claim.append && render === claim.render,
          );
          if (index !== -1) slots.splice(index, 1);
        };
      },
    },
  } as unknown as Plugin.Context;

  const cleanup = await tuiPlugin.setup(context);

  return {
    registered,
    permissionLookups,
    permissionSyncs,
    render(input) {
      const slot = slots.find(({ path }) => path === "session.composer.top");
      if (slot === undefined) throw new Error("the plugin did not register session.composer.top");
      return slot.render(input);
    },
    async dispose() {
      if (typeof cleanup === "function") await cleanup();
    },
  };
}
