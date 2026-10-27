Status: resolved

# Add a highlighted call block to the ask banner

## Problem Statement

When the plugin holds a shell command with an ask, OpenCode's built-in permission prompt shows the command as a single-color string. For a long or busy command — pipelines, many flags, embedded strings — the user has to parse a wall of monochrome text to decide whether to approve it.

The ask banner above the composer already shows the brand label and the reasons the policy gave, but not the call itself. The user's only view of what is being approved is the prompt's unhighlighted copy, and the banner — the one surface this plugin owns next to the prompt — says nothing about the command.

## Solution

The ask banner gains a **call block**: a syntax-highlighted display of the ask's tool call, rendered between the brand label and the reason bullets. For shell asks — every ask the banner shows today — the call is the full command line: the same line the engine verdicted (ADR-0003) and the same line the prompt shows.

The block highlights with the host's tree-sitter registration, word-wraps, is bounded at half the terminal height, and scrolls inside itself when the command is longer, so it can never push the composer off screen (ADR-0007). It appears for every branded ask, follows the same ask the prompt is showing, and disappears with it. The server half is unchanged.

## User Stories

The call block

1. As a user approving a shell command, I want the command shown as a syntax-highlighted block in the ask banner, so that I can read it with strings, pipes, and flags visually distinct.
2. As a user, I want the block to show the full command line exactly as it will run, so that what I approve is what runs.
3. As a user, I want the command rendered with shell syntax highlighting, so that long commands are easier to parse than the prompt's single-color copy.
4. As a user, I want long command lines to wrap inside the block, so that nothing runs off the edge of the terminal.
5. As a user, I want the block to be at most half the terminal height, so that the composer and the prompt stay on screen.
6. As a user, I want a command longer than the bound to scroll inside the block, so that I can read every part of it.
7. As a user, I want a short command to occupy only as many lines as it needs, so that the block never adds empty space.
8. As a user, I want the command selectable in the block, so that I can copy it to inspect it elsewhere.
9. As a user, I want the block to appear for every ask the banner shows, so that the banner is consistent.

Placement and layout

10. As a user, I want the banner to show the brand label, then the call block, then the reason bullets, so that the command I am approving sits between the policy's name and its reasons.
11. As a user, I want the call block and the reasons in the same banner, so that I can read command and reasons together.
12. As a user, I want the block to belong to the same ask the permission prompt is showing, so that the banner and the prompt never disagree.
13. As a user, I want a subagent's ask to show its call block in the parent session's banner, as its reasons do, so that I can decide subagent commands without opening the subagent.
14. As a user, I want no call block inside a subagent's own session, because the banner itself does not appear there.
15. As a user, I want no call block for asks without the brand label, so that I never see another tool's call under this policy's banner.

Reactivity

16. As a user, I want the block to switch to the next pending ask's call when I answer one, so that the banner tracks the prompt.
17. As a user who reconnects while an ask is pending, I want the banner and its call block to recover, so that a dropped connection does not hide the command I am about to approve.
18. As a user, I want the block to fill in as soon as the session data is available, so that I never wait on the command while the reasons are already shown.

Robustness

19. As a user, I want the banner to fall back to the label and reasons when the call cannot be recovered, so that a display gap never hides the reasons.
20. As a user, I want a failure in the call block to leave the prompt, the verdict, and the reasons working, so that a display fault never changes a verdict.
21. As a user whose host has not finished loading the shell parser, I want the block to show the command unstyled until highlighting is ready, so that the command is never missing while the parser loads.

Autoaccept

22. As a user in autoaccept mode, I want the block to appear only briefly, because OpenCode approves each ask at once, so that I am not shown calls for asks that never wait for me.

Future and documentation

23. As a maintainer, I want the block's content to derive through a per-action mapping, so that future non-shell asks add their own prettified display without reworking the banner.
24. As a user, I want the README to describe the call block, so that I know what the banner shows.
25. As a maintainer, I want the glossary and ADR 0007 to record the decision, so that later changes respect it.

## Implementation Decisions

- The server half is unchanged: verdicts, the ask message (brand label and reasons), the deny message, command capture, and the engine all keep their current behaviour.
- The banner's structure changes from one plain text node to a vertical stack: the brand label text, the call block, then the reason bullets. The label and the reasons continue to come from the ask's message exactly as today; only the block is new.
- Call block content derives through a pure per-action mapping: the chosen ask's permission request and the session's message data in, a content-and-filetype pair or nothing out. The mapping has one entry for now, `shell`: it resolves the request's `source` to the session message, finds the tool part, and reads the command from its input, handling both the object input of a running call and the string input of a streaming one. Any other action returns nothing.
- The request's `source` is the only reliable link to the call: the built-in shell passes no `metadata`, and `resources` are the per-simple-command pieces that ADR-0003 rejects. The host's own prompt recovers the command from the same message and tool part, which corroborates the path.
- The block renders as an OpenTUI code element with filetype `bash` — the parser the host registers process-wide at startup, to which `sh` resolves in core — with word wrapping and its default selectability. No parser is bundled and no download is triggered by the plugin (ADR-0007).
- The code element's required syntax style is built from the host-resolved theme, owned by the renderer's native scene. If the theme cannot produce one, the block degrades to unstyled text; it never fails the banner.
- The block is height-bounded at half the terminal height, read reactively from the plugin context's renderer. Content shorter than the bound renders at its natural height. Content beyond the bound scrolls inside the block using the element's native scroll handling. The `session.composer.top` slot itself cannot scroll, so this bound is what keeps the composer on screen (ADR-0007). The fraction is a tunable constant.
- On mount, the slot syncs the viewed session family's messages alongside the existing permission sync, so the block recovers after a reconnect. The block re-derives reactively when the chosen ask changes or its message data arrives.
- When derivation yields nothing — no `source`, missing message, missing tool part, or a non-shell action — the banner renders exactly as today: label and reasons, no block. This is the last-resort fallback; the recovery design aims for it to never fire.
- The per-action mapping is the seam for future non-shell permission support: each action adds an entry with its own prettified content and filetype. Nothing for non-shell tools is built in this spec.
- The feature is always on; no configuration flag is added. The mode system governs policy levels, not display.
- The terminal entry remains the compiled Solid JSX build (ADR-0005). The code element and the syntax-style API come from the existing `@opentui/core` and `@opentui/solid` dependencies, so no new externals, optional peers, or runtime dependencies are introduced.
- Documentation: the README gains a description of the call block in its ask-banner section. The glossary entries **Ask banner** and **Call block** and ADR-0007 are already in place.

## Testing Decisions

Good tests assert what the banner shows for a given session state — through the pure derivation and through the rendered frame — and do not assert internal reactivity, module structure, or highlighting internals.

Modules and cases:

- **Call-block derivation (pure function, the one new seam).** Cases: a shell ask whose `source` resolves to a message with a matching tool part yields the full command line with filetype `bash`; a running call's object input and a streaming call's string input both resolve to the same line; a request without a `source` yields nothing; a `source` whose message is missing yields nothing; a `source` whose message has no matching tool part yields nothing; a non-shell action yields nothing.
- **Terminal plugin (existing fake harness, extended).** The fake terminal context gains a `message` data collection, a `source`-bearing pending permission, and `renderer`/`theme` stubs. Cases: the banner frame shows the label, then the command, then the reasons, in that order; the block is absent and the frame matches today's banner when derivation yields nothing; a tall command is clipped to half the rendered height with the remainder reachable by scrolling; the block re-derives when the chosen ask changes; a message sync runs on mount for the viewed session and its family, alongside the permission sync; a failing message read leaves the label and reasons rendered and produces no unhandled error.
- **Frame harness (extended).** The render helper accepts a width and height, so the height bound is asserted at at least two terminal sizes.
- **Server half (existing harness).** Regression only: the ask and deny messages, the verdicts, and the command capture are unchanged.
- **Package entry and manifest (existing).** Regression only: no new exports or dependencies.

Prior art: the pure ask-banner rule and its tests, the terminal plugin's fake-harness frame tests, and the two test-support harnesses being extended.

## Out of Scope

- Any change to the built-in permission prompt. It is host-owned: the slot API has no slot for it and the host never renders the plugin's message in it (ADR-0007).
- Non-shell asks. The mapping has a single `shell` entry; prettified displays for other tools arrive with that future support.
- A keybind to resize the block. ADR-0007 records it as a plausible later extension.
- Bundling a tree-sitter parser with the package. The host's process-wide registration is the source of highlighting.
- A configuration flag to hide the call block. The feature is always on.
- Deny reasons or a call block for denials. The banner is ask-only (ADR-0004).
- Horizontal scrolling or a no-wrap mode for the block. Word wrapping is the display.
- Any upstream OpenCode change.

## Further Notes

- The v2.1.1 host's own permission prompt recovers the command from the same session message and tool part the banner will use, which corroborates the recovery path against the version this package targets.
- The host reads its parser registrations at tree-sitter client initialization, and the TUI registers them at startup before any client exists, so plugin-rendered code elements pick them up. If a future host drops the `bash` registration, the block degrades to unstyled text rather than failing.
- On terminals under roughly 24 lines the bottom stack (banner, prompt, composer) can still overflow slightly; this is accepted and recorded in ADR-0007.
- The ½-viewport fraction is a tunable constant in the banner component; the design does not depend on the exact value.
