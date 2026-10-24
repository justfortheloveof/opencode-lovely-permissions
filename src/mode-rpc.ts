import type { Rpc } from "@opencode/plugin";

export type ModeList =
  | { status: "ready"; modes: string[]; activeMode: string }
  | { status: "absent" }
  | { status: "invalid" };

export type SetModeResult =
  | { status: "changed"; activeMode: string }
  | { status: "unchanged"; activeMode: string }
  | { status: "invalid-mode"; mode: string }
  | { status: "invalid-policy"; mode: string }
  | { status: "engine-failed" };

interface StandardSchema<Input, Output> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly types: { readonly input: Input; readonly output: Output };
    readonly validate: (
      value: unknown,
    ) => { readonly value: Output } | { readonly issues: readonly { readonly message: string }[] };
  };
}

const modeListInput = standardSchema<Record<string, never>, Record<string, never>>(
  (value): value is Record<string, never> => isRecord(value) && Object.keys(value).length === 0,
);

const setModeInput = standardSchema<{ mode: string }, { mode: string }>(
  (value): value is { mode: string } => isRecord(value) && typeof value.mode === "string",
);

const modeListOutput = standardSchema<ModeList, ModeList>((value): value is ModeList => {
  if (!isRecord(value)) return false;
  if (value.status === "absent" || value.status === "invalid") return true;
  return (
    value.status === "ready" &&
    Array.isArray(value.modes) &&
    value.modes.every((mode) => typeof mode === "string") &&
    typeof value.activeMode === "string"
  );
});

const setModeOutput = standardSchema<SetModeResult, SetModeResult>(
  (value): value is SetModeResult => {
    if (!isRecord(value)) return false;
    if (value.status === "engine-failed") return true;
    if (value.status === "changed" || value.status === "unchanged") {
      return typeof value.activeMode === "string";
    }
    return (
      (value.status === "invalid-mode" || value.status === "invalid-policy") &&
      typeof value.mode === "string"
    );
  },
);

export const MODE_RPC = {
  id: "lovely-permissions",
  methods: {
    listModes: { input: modeListInput, output: modeListOutput },
    setMode: { input: setModeInput, output: setModeOutput },
  },
  events: {},
} satisfies Rpc.PortableDefinition;

function standardSchema<Input, Output>(
  isOutput: (value: unknown) => value is Output,
): StandardSchema<Input, Output> {
  return {
    "~standard": {
      version: 1,
      vendor: "lovely-permissions",
      types: {
        input: undefined as unknown as Input,
        output: undefined as unknown as Output,
      },
      validate(value) {
        return isOutput(value) ? { value } : { issues: [{ message: "Invalid RPC value" }] };
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
