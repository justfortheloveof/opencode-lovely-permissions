# Ask reasons show in a TUI banner; deny reasons stay in the deny message

Ask reasons appear only in a TUI banner while the ask is pending, so the agent never sees them. Deny reasons stay in the deny message, which the agent reads, because every text a plugin can place on the timeline is also read by the model, and CLI plugins have no transcript slot.

Considered options:

- Generic deny text, with the reasons in a side channel for the TUI. Rejected: the user wants deny reasons in the deny message.
- A synthetic notice carrying the reasons, with the model-facing text filtered out by a hook. Rejected: it relies on a hidden sentinel and filtering hooks, and it appears only after the tool row.
- A decision log of asks, approvals, and denials. Rejected: the banner is the only TUI surface.
- An upstream OpenCode change to render ask reasons in the prompt or on the timeline. Not pursued.

Consequences: the agent keeps seeing deny reasons, as before. A denied row shows its reasons only when expanded. A TUI machine needs a `cli.json` entry to show the banner against any server, and every server that runs commands needs the server half.
