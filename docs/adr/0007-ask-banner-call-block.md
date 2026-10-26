# Ask banner shows the tool call as a self-scrolling highlighted block

The prompt that displays a command is OpenCode's built-in TUI: the v2 slot API has no slot for it, and the host renders neither the request's `message` nor any highlighting in it (verified against v2.1.1's `permission.tsx`), so the plugin cannot give the prompt's single-color command string syntax highlighting. The ask banner therefore duplicates the call: it renders the ask's full command line as a highlighted code block — brand label, call block, reason bullets — above the composer. The command is recovered on the TUI side from the ask's `source` via the session's message and the shell tool part's `input.command`, the same full line the engine verdicted (ADR-0003) and the same source the host's own prompt reads. Content derives through a per-action mapping so future non-shell tools add entries (a prettified input) without rework.

Highlighting rides on the host: the TUI registers 34 tree-sitter parsers process-wide at startup, `bash` included (`sh` resolves to it), so the block needs no bundled parser and degrades to unstyled text only if a host registration ever lacks the filetype. The block is height-bounded at half the terminal height and scrolls inside itself when the command is longer: the `session.composer.top` slot renders unbounded in a non-shrinking stack, so an uncapped block would squeeze the transcript to zero and push the composer off the bottom edge.

Considered options:

- An upstream OpenCode change to render the prompt's command as a highlighted block. Not pursued, consistent with ADR-0004; the slot map gives the plugin no reach into the prompt.
- Joining the permission request's `resources` for the block text. Rejected: ADR-0003 shows the split pieces lose the full line the user is approving.
- Bundling a `tree-sitter-bash` parser with the package. Rejected: the host already registers one process-wide; bundling would duplicate it and drift from the host's version.
- An unbounded block (no height cap). Rejected: the slot cannot scroll, so a long command would push the composer off-screen on a small terminal.
- A fixed line-count cap with a "… N more lines" truncation. Rejected: it hides command content the user is being asked to approve; a self-scrolling ½-viewport bound shows everything.

Consequences: while an ask is pending the command appears twice (prompt, banner); the banner copy is the highlighted, fully readable one. A first-ever bash ask highlights a beat late while the host downloads the parser wasm. On terminals under ~24 lines the bottom stack can still overflow slightly. A keybind to resize the block is a plausible later extension.
