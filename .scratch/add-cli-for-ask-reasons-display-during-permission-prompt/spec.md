Status: ready-for-agent

# Add a CLI banner for ask reasons during the permission prompt

## Problem Statement

When the agent asks to run a shell command that the policy does not clearly allow, OpenCode shows its permission prompt with only the command. The reasons the policy gave, and the brand label that marks them as this policy's, are on the permission request, but nothing shows them. The user has to guess why the command was held, and whether the policy or the engine decided it. The same gap hides the reasons for the missing-policy ask, which names the three policy file locations.

Denied commands already carry their reasons in the deny message, but that message appears on the timeline only after the user expands the denied row. The user wants the ask reasons visible while they are deciding, and wants them kept out of the agent's view.

## Solution

Add a terminal-client (CLI) half to this package. While an ask waits for the user, a banner above the session composer shows the reasons for the ask that the permission prompt is showing, under the brand label. When that ask is answered, the banner goes away, and the next pending ask's reasons appear if one is waiting.

The server half is unchanged. Ask reasons stay on the pending permission request, so the agent never sees them. Deny reasons stay in the deny message, which the agent reads, as it does today, and which the user can expand on the timeline.

The banner works only where the server half is active and the terminal machine has the package. Every server that runs commands must load the plugin. The terminal machine needs an entry in `cli.json`.

## User Stories

Ask reasons while deciding

1. As a user, I want the reasons for a pending shell ask shown above the composer, so that I can decide with the reasons in view.
2. As a user, I want the reasons shown under the brand label exactly as the plugin wrote them, so that I can recognise them as this policy's.
3. As a user, I want one bullet per reason, in the order the engine produced them, so that I can match each reason to a rule.
4. As a user, I want the banner to disappear when I approve or reject the ask, so that it does not linger after the decision.
5. As a user, I want the next pending ask's reasons to appear when one ask is answered and another is still waiting, so that I always see the ask I am deciding.
6. As a user, I want the banner to show only the ask the permission prompt is showing, so that the banner and the prompt never disagree.
7. As a user, I want the missing-policy ask's file locations shown in the banner, so that I can see why every command asks when no policy file exists.

Where the banner appears

8. As a user, I want the banner in the parent session's view, so that I see it where I am working.
9. As a user, I want asks from a subagent shown in the parent session's banner, as the prompt shows them, so that I can decide on subagent commands without opening the subagent.
10. As a user, I want no banner inside a subagent's own session, because the prompt does not appear there either.
11. As a user, I want asks from OpenCode or from other plugins to show no banner, so that I never see another tool's text under this policy's label.
12. As a user, I want no banner when no ask is pending, so that allowed and denied commands do not add noise above the composer.
13. As a user, I want an ask with no reasons to show no banner, so that an empty banner never appears.

Autoaccept

14. As a user in autoaccept mode, I want the banner to appear only briefly, because OpenCode approves each ask at once, so that I am not shown reasons for asks that never wait for me.

Reconnecting

15. As a user who reconnects while an ask is pending, I want the banner to recover, so that a dropped connection does not hide the reasons for an ask I still have to decide.

Agent visibility

16. As a user, I want ask reasons kept from the agent, so that the agent cannot see the reasons for a command the policy is holding.
17. As a user, I want deny reasons to stay in the deny message the agent reads, so that the agent can change course after a denial.
18. As a user, I want a denied command's reasons shown when I expand its timeline row, so that I can see why it was stopped.

Installation and remote servers

19. As a user, I want the terminal half to ship in the same package as the server half, so that I install one package.
20. As a user, I want to add the package to the terminal client's `cli.json`, so that the banner is loaded locally when the terminal session supports it.
21. **Deferred (user waived ticket 09):** behavior when connected to a remote server that runs the server half is unverified and is not required for this release.
22. **Deferred (user waived ticket 09):** behavior when connected to a remote server without the server half is unverified and is not required for this release.
23. As a server operator, I want the README to say every server that runs commands must load the plugin, so that commands are never run ungated.
24. As a user, I want the README to say that a terminal machine needs the `cli.json` entry, so that the banner appears on my machine.

Package and dependencies

25. As a maintainer, I want the terminal half's OpenTUI and Solid dependencies declared as optional peers, so that the server half installs without them.
26. As a maintainer, I want the OpenCode plugin package to stay pinned at 2.0.30, so that both halves target the host API we tested against.

Robustness

27. As a user, I want a failure in the banner to leave the prompt and the policy working, so that a display fault never changes a verdict.

Documentation

28. As a user, I want the README's known limitation about ask prompts removed once the banner ships, so that the docs match the behaviour.
29. As a maintainer, I want the glossary entries and ADR 0004 to describe the split, so that later changes respect it.

## Implementation Decisions

- The server half is unchanged. Verdicts, the ask message, and the deny message keep their current content and placement. The ask brand label and deny brand label stay as the glossary defines them.
- The terminal half is a second entry point of this package. Its public `./tui` export points to `src/tui.ts`, which is shipped in the package. For a terminal client's `cli.json` entry that points to a local package directory, the pinned `@opencode/plugin` 2.0.30 `Host.resolve` probes `<directory>/tui` rather than consulting the package's `./tui` export; ship a root `tui.ts` re-export shim so this explicit local loading path resolves. Automatic server-listed loading from a remote server is unverified and is not a release claim.
- The terminal entry must contain no raw JSX syntax. It builds Solid elements with explicit `jsx()` calls (and `jsxs()` when needed) imported from the host virtual runtime module `opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime`, and imports the plugin SDK from `opentui:runtime-module:%40opencode%2Fplugin%2Ftui`. OpenCode's external package loader provides these host modules. The OpenTUI Solid transform excludes source under `node_modules`, and Bun may inject an unresolvable React or local JSX-runtime import for external JSX; do not ship raw JSX or work around this with React or a local/Vite JSX transform.
- The banner is one slot above the composer in the session view. The slot receives the session ID.
- Which ask the banner shows follows the permission prompt. It takes the first pending ask across the viewed session and its descendant sessions, in that order. Nothing shows when the viewed session has a parent. Nothing shows when the chosen ask's message does not start with the ask brand label, or when the ask has no reasons. The choice is a pure rule. The slot gathers the ordered asks and passes them to the rule, so the rule can be tested without the UI.
- Autoaccept is not mirrored, because the terminal plugin API does not expose the permission mode. In autoaccept mode the banner may flash briefly before OpenCode approves the ask.
- The banner shows the chosen ask's message as the server half wrote it. The terminal half does not rebuild the text.
- On mount, the terminal half syncs pending permission requests for the viewed session family, so the banner recovers after a reconnect.
- A failure in the terminal half must not affect the prompt, the verdict, or the deny message. It shows nothing when it fails.
- Dependencies: keep `@opencode/plugin` pinned at 2.0.30. Declare `@opentui/core` and `@opentui/solid` at `>=0.5.17` and `solid-js` at `>=1.9.0`, all as optional peers. Dev dependencies pin `@opentui/core` 0.5.17, `@opentui/solid` 0.5.17, and `solid-js` 1.9.15, matching OpenCode's own pins.
- Documentation: the glossary entries **Ask banner** and **Deny message** and ADR 0004 are already in place. At ship time, the README gains the `cli.json` instruction, and its known limitation about ask prompts is removed.
- The new test seams are the pure rule that picks the ask, and the terminal plugin's setup, exercised through a fake terminal-client context. The package-entry test separately imports the public `opencode-lovely-bash-permissions/tui` subpath through the package manifest. See Testing Decisions.

## Testing Decisions

Good tests assert what the banner shows for given session state and pending requests, through the terminal plugin's setup. They do not assert internal module structure or reactivity internals.

Modules and cases:

- **Terminal rule (pure function).** Cases: the banner shows the chosen ask's message verbatim; the first pending ask is chosen; no banner for an ask without the brand label, even when a later ask has it; no banner in a child session; no banner when nothing is pending; no banner for an ask with no reasons; the missing-policy ask is shown.
- **Terminal plugin (fake harness).** The harness records the composer-top slot and drives its render with fake session data and pending requests. Cases: the slot passes the viewed session's asks, then its subagents' asks in family order, to the rule; a sync runs on mount for the viewed session and its family; the banner clears when its ask is answered and the next ask appears; a failing data read or rule renders nothing and does not throw.
- **Server half (existing harness).** Regression only. The existing tests keep the ask and deny messages unchanged.
- **Package entry and manifest.** Extend the existing package-entry test to import the public `opencode-lovely-bash-permissions/tui` subpath, verify its plugin identifier, and check that the manifest exports and ships `src/tui.ts` with the optional peer ranges. Exercise `Host.resolve` for the local package directory and verify it selects the shipped root `tui.ts` shim while the public `./tui` export remains `src/tui.ts`. Test-only aliases provide small fakes for the three host virtual runtime IDs, so this test does not need a JSX transform or React. It verifies package resolution and the public entry seam, not OpenCode's actual runtime-module loader.

Rendered output is not automated. Ticket 10 is the human-only in-app check. Ticket 09's remote-loading verification was waived by the user; automatic server-listed loading from a remote server remains unverified and must not be claimed in the README. Ticket 02 does not claim in-app validation.

Prior art: `tests/support/fake-context.ts` (the server harness, which the new harness should mirror), `tests/index.test.ts` (hook and verdict tests), and `tests/package-entry.test.ts` (manifest checks).

## Out of Scope

- Timeline placement of ask reasons. Terminal plugins have no transcript slot.
- Deny reasons in the banner. They stay in the deny message.
- A decision log of asks, approvals, and denials.
- Non-shell asks, such as edits and writes.
- Handling the "always" choice on an approval prompt.
- Mirroring autoaccept mode in the banner.
- Hiding the banner while the composer panel is open. The prompt hides then, but the plugin cannot read composer state. Matching it exactly would need an upstream change.
- Any upstream OpenCode change.
- Automated rendered-output tests with an OpenTUI renderer.
- Terminal-only packages without a server half.
- Automatic loading of a server-listed terminal entry for remote sessions; that behavior is unverified and was waived by the user.

## Further Notes

- **Remote loading is unverified and waived.** The user has no remote server and does not require automatic server-listed terminal plugin loading. The local `cli.json` entry is the explicit terminal-side installation path; do not claim remote loading was tested.
- **Glossary wording is pending.** The **Verdict** entry does not yet cover the missing-policy ask, which asks without an engine verdict. The wording is still to be decided.
- **Superseded research.** `.scratch/branded-ask-reasons/research.md` recommended a server-only notice. That recommendation was rejected, and ADR 0004 records the decision.
- **README changes wait for the ship.** The `cli.json` instruction and the known-limitation removal land with the terminal half, so the docs never describe a setup that does not work yet.
