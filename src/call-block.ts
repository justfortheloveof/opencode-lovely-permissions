/**
 * The call block the ask banner shows: the syntax-highlighted display of an ask's tool call.
 * For a shell ask it is the full command line, read from the shell tool part of the ask's message.
 */
export interface CallBlock {
  readonly content: string;
  readonly filetype: string;
}

/**
 * The link from a permission request to the tool call it refers to: the session message that
 * carries the call, and the id of the tool part within it.
 */
export interface PermissionSource {
  readonly type: "tool";
  readonly messageID: string;
  readonly id: string;
}

/** The chosen ask's permission request. */
export interface PermissionRequest {
  readonly id: string;
  readonly action: string;
  readonly message?: string;
  readonly source?: PermissionSource;
}

/**
 * The lifecycle state of a tool part. A running/completed/errored call carries its input as an
 * object; a streaming one carries the raw input as a string.
 */
export interface ToolState {
  readonly status: "streaming" | "running" | "completed" | "error";
  readonly input: string | Record<string, unknown>;
}

/** One part of an assistant message. Only tool parts carry an `id` and a `state`. */
export interface Part {
  readonly type: string;
  readonly id?: string;
  readonly state?: ToolState;
}

/** A session message. Only `assistant` messages carry the `content` parts. */
export interface Message {
  readonly id: string;
  readonly type: string;
  readonly content?: readonly Part[];
}

/**
 * The per-action mapping seam: each action that gets a call block adds an entry here, deriving its
 * own prettified content and filetype from the request's `source` and the session's messages.
 */
const entries: Record<
  string,
  (source: PermissionSource, messages: readonly Message[]) => CallBlock | undefined
> = {
  shell: shellCallBlock,
};

/** Derive the call block for the chosen ask, or nothing when it cannot be recovered. */
export function pickCallBlock(
  request: PermissionRequest,
  messages: readonly Message[],
): CallBlock | undefined {
  const source = request.source;
  const entry = entries[request.action];
  if (!source || !entry) return undefined;

  return entry(source, messages);
}

/** The shell entry: the full command line, filetype `bash`. */
function shellCallBlock(
  source: PermissionSource,
  messages: readonly Message[],
): CallBlock | undefined {
  const command = commandLine(source, messages);
  return command === undefined ? undefined : { content: command, filetype: "bash" };
}

/**
 * Recover the command line from the request's `source`: the session message, then the tool part,
 * then the part's input. A streaming call's string input is the command line; a running one's object
 * input holds it under `command`.
 */
function commandLine(source: PermissionSource, messages: readonly Message[]): string | undefined {
  const message = messages.find((candidate) => candidate.id === source.messageID);
  if (!message || message.type !== "assistant") return undefined;

  const part = message.content?.find(
    (candidate) => candidate.type === "tool" && candidate.id === source.id,
  );
  const input = part?.state?.input;
  if (input === undefined) return undefined;

  // A streaming call's string input is the command line; a running one keeps it under `command`.
  if (typeof input === "string") return input;
  const command = input.command;
  return typeof command === "string" ? command : undefined;
}
