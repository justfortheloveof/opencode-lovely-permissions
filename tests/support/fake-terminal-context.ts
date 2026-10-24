import type { Plugin } from "@opencode/plugin/tui";
import { createSignal } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { ModeList, SetModeResult } from "../../src/mode-rpc.ts";
import tuiPlugin from "../../src/tui.tsx";

interface PendingPermission {
  readonly message?: string;
}

interface SessionInfo {
  readonly parentID?: string;
  readonly location?: LocationRef;
}

interface LocationRef {
  readonly directory: string;
  readonly workspaceID?: string;
}

interface SlotInput {
  readonly sessionID: string;
}

interface RecordedSlot {
  readonly path: string;
  readonly render: (input: SlotInput) => JSX.Element;
}

interface SlotClaim {
  readonly append: "session.composer.top";
  readonly render: (input: SlotInput) => JSX.Element;
}

export interface TerminalPluginHarness {
  /** Slot paths the plugin registered. */
  readonly registered: string[];
  /** Session IDs requested from the fake permission data. */
  readonly permissionLookups: string[];
  /** Session IDs whose pending permissions were synced when the slot mounted. */
  readonly permissionSyncs: string[];
  /** Slash command names registered by the plugin. */
  readonly slashCommands: string[];
  /** Mode picker dialogs opened by the plugin command. */
  readonly pickerRequests: Array<{
    readonly title: string;
    readonly options: readonly { readonly title: string; readonly value: string }[];
    readonly current?: string;
  }>;
  /** Locations used for Mode-list RPC calls. */
  readonly modeListLocations: Array<LocationRef | undefined>;
  /** Mode-change RPC inputs and locations. */
  readonly modeChanges: Array<{ readonly mode: string; readonly location?: LocationRef }>;
  /** Toasts shown by the plugin. */
  readonly toasts: unknown[];
  /** Custom dialogs shown by the plugin. */
  readonly customDialogs: Array<() => JSX.Element>;
  /** Alert dialogs shown by the plugin. */
  readonly alertRequests: Array<{ readonly title: string; readonly message: string }>;
  /** Runs the registered composer-top slot with the host-provided input. */
  render(input: SlotInput): JSX.Element;
  /** Replaces a session's pending permissions and updates an active render. */
  setPermissions(sessionID: string, permissions: readonly PendingPermission[]): void;
  /** Runs a registered slash command by its name. */
  runCommand(name: string): Promise<void>;
  /** Runs the terminal plugin's cleanup hook. */
  dispose(): Promise<void>;
}

interface SessionState {
  readonly sessionsByID?: Readonly<Record<string, SessionInfo>>;
  readonly familyBySession?: Readonly<Record<string, readonly string[]>>;
  readonly permissionsAfterSync?: Readonly<Record<string, readonly PendingPermission[]>>;
  readonly syncFailure?: Error;
  readonly modeList?: ModeList;
  readonly selectedMode?: string;
  readonly setModeResult?: SetModeResult;
  readonly route?:
    | { readonly type: "session"; readonly sessionID: string }
    | { readonly type: "home" };
}

/** Runs the terminal plugin against fake pending permissions and records its slots. */
export async function startTerminalPlugin(
  permissionsBySession: Readonly<Record<string, readonly PendingPermission[]>>,
  sessionState: SessionState = {},
): Promise<TerminalPluginHarness> {
  const registered: string[] = [];
  const permissionLookups: string[] = [];
  const permissionSyncs: string[] = [];
  const slashCommands: string[] = [];
  const pickerRequests: TerminalPluginHarness["pickerRequests"] = [];
  const modeListLocations: Array<LocationRef | undefined> = [];
  const modeChanges: TerminalPluginHarness["modeChanges"] = [];
  const toasts: unknown[] = [];
  const customDialogs: TerminalPluginHarness["customDialogs"] = [];
  const alertRequests: TerminalPluginHarness["alertRequests"] = [];
  const commands: Array<{ id?: string; slash?: { name: string }; run: () => unknown }> = [];
  const slots: RecordedSlot[] = [];
  const permissions = new Map<
    string,
    {
      readonly get: () => readonly PendingPermission[];
      readonly set: (value: readonly PendingPermission[]) => void;
    }
  >();
  const sessionsByID = sessionState.sessionsByID ?? {};
  const familyBySession = sessionState.familyBySession ?? {};

  function permissionSignal(sessionID: string) {
    let signal = permissions.get(sessionID);
    if (signal === undefined) {
      const [get, set] = createSignal(permissionsBySession[sessionID] ?? []);
      signal = { get, set };
      permissions.set(sessionID, signal);
    }
    return signal;
  }

  const context = {
    location: { directory: "/current" },
    client: {
      rpc(definition: { id: string }) {
        if (definition.id !== "lovely-bash-permissions") {
          throw new Error(`unexpected RPC definition: ${definition.id}`);
        }
        return {
          async listModes(
            _input: Record<string, never>,
            options?: { location?: LocationRef },
          ): Promise<ModeList> {
            modeListLocations.push(options?.location);
            return sessionState.modeList ?? { status: "absent" };
          },
          async setMode(
            input: { mode: string },
            options?: { location?: LocationRef },
          ): Promise<SetModeResult> {
            modeChanges.push({ mode: input.mode, location: options?.location });
            return sessionState.setModeResult ?? { status: "changed", activeMode: input.mode };
          },
        };
      },
    },
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
            return permissionSignal(sessionID).get();
          },
          sync(sessionID: string) {
            permissionSyncs.push(sessionID);
            const permissions = sessionState.permissionsAfterSync?.[sessionID];
            if (permissions !== undefined) permissionSignal(sessionID).set(permissions);
            if (sessionState.syncFailure !== undefined) {
              return Promise.reject(sessionState.syncFailure);
            }
            return Promise.resolve();
          },
        },
      },
    },
    ui: {
      dialog: {
        show(render: () => JSX.Element): void {
          customDialogs.push(render);
        },
        alert(options: { title: string; message: string }): Promise<void> {
          alertRequests.push(options);
          return Promise.resolve();
        },
        select<Value>(options: {
          title: string;
          options: readonly { title: string; value: Value }[];
          current?: Value;
        }): Promise<Value | undefined> {
          pickerRequests.push(options as TerminalPluginHarness["pickerRequests"][number]);
          return Promise.resolve(sessionState.selectedMode as Value | undefined);
        },
      },
      toast: {
        show(message: unknown) {
          toasts.push(message);
        },
      },
      router: {
        current() {
          return sessionState.route ?? { type: "session", sessionID: "ses_viewed" };
        },
      },
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
    keymap: {
      layer(factory: () => { commands?: ReadonlyArray<(typeof commands)[number]> }) {
        for (const command of factory().commands ?? []) {
          commands.push(command);
          if (command.slash !== undefined) slashCommands.push(command.slash.name);
        }
      },
    },
  } as unknown as Plugin.Context;

  const cleanup = await tuiPlugin.setup(context);

  return {
    registered,
    permissionLookups,
    permissionSyncs,
    slashCommands,
    pickerRequests,
    modeListLocations,
    modeChanges,
    toasts,
    customDialogs,
    alertRequests,
    render(input) {
      const slot = slots.find(({ path }) => path === "session.composer.top");
      if (slot === undefined) throw new Error("the plugin did not register session.composer.top");
      return slot.render(input);
    },
    setPermissions(sessionID, nextPermissions) {
      permissionSignal(sessionID).set(nextPermissions);
    },
    async runCommand(name) {
      const command = commands.find(({ id, slash }) => id === name || slash?.name === name);
      if (command === undefined) throw new Error(`the plugin did not register /${name}`);
      await command.run();
    },
    async dispose() {
      if (typeof cleanup === "function") await cleanup();
    },
  };
}
