const SHELL_TOOL = "shell";

const commands = new Map<string, string>();

/** The command line captured for a call, or undefined when none is held for that call ID. */
export function commandFor(callID: string): string | undefined {
  return commands.get(callID);
}

export function recordCommand(event: {
  readonly tool: string;
  readonly id: string;
  readonly input: unknown;
}): void {
  if (event.tool !== SHELL_TOOL) return;
  const command = commandOf(event.input);
  if (command !== undefined) commands.set(event.id, command);
}

export function forgetCommand(event: { readonly id: string }): void {
  commands.delete(event.id);
}

function commandOf(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || !("command" in input)) return undefined;
  return typeof input.command === "string" ? input.command : undefined;
}
