import { ASK_LABEL } from "./labels.ts";

interface PendingAsk {
  message: string;
}

/** Pick the first pending ask's message when it is one of this plugin's reason-bearing asks. */
export function pickAskBannerMessage(asks: readonly PendingAsk[]): string | undefined {
  const message = asks[0]?.message;
  if (!message?.startsWith(ASK_LABEL)) return undefined;

  const hasReason = message
    .slice(ASK_LABEL.length)
    .split("\n")
    .some((line) => line.startsWith("- ") && line.slice(2).trim().length > 0);

  return hasReason ? message : undefined;
}
