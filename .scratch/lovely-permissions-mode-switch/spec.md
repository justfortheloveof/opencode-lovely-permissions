Status: ready-for-agent

# Temporarily switch bash Modes from the TUI

## Problem Statement

OpenCode users can configure named Modes for the lovely bash Policy, but the active Mode is currently chosen through a plugin option when the server plugin starts. Changing it requires editing configuration and restarting OpenCode. Users must also remember which Mode names they configured, even though those names are already available to the plugin.

Users want an in-session way to discover and temporarily switch among the Modes configured for the current project location.

## Solution

Add the TUI slash command `/lovely-permissions-cfg`. It opens a picker containing the distinct Mode names in the merged configuration loaded for the current location and marks the active Mode. Selecting a valid Mode immediately changes the active bash Policy for future permission checks across that location. The selection is temporary, is not written to configuration, and is cleared when the server plugin reloads or restarts.

If no Modes are configured, invoking the command opens a picker-style empty-state modal that says “No modes configured.” The server plugin remains active. Shell permission requests continue to ask for approval and include “No modes configured; defaulting to ask.” as the first reason, followed by the existing bullets identifying the missing policy-file locations. Existing OpenCode denies remain denies.

The picker validates a Mode before switching. An invalid configured Policy leaves the current Mode unchanged and displays “Configuration invalid for mode <name>.” If the loaded configuration is invalid before a Mode can be selected, the picker displays “Configuration invalid.”

## User Stories

1. As an OpenCode user, I want to invoke `/lovely-permissions-cfg` without arguments, so that I do not need to remember Mode names or command syntax.
2. As an OpenCode user, I want the command to open a picker in the TUI, so that I can choose a Mode interactively.
3. As an OpenCode user, I want to see every distinct Mode name from the merged global, project, and local configuration for the current location, so that I can choose any Mode the plugin can use there.
4. As an OpenCode user, I want identically named Modes from multiple policy files to appear as one choice, so that the picker reflects the effective merged configuration.
5. As an OpenCode user, I want the currently active Mode marked in the picker, so that I can see what will govern shell checks before making a change.
6. As an OpenCode user, I want the picker to show Mode names without requiring descriptions in my policy files, so that my existing configuration works without a schema change.
7. As an OpenCode user, I want choosing a valid Mode to change the active bash Policy immediately, so that later shell permission checks use my selection without restarting OpenCode.
8. As an OpenCode user, I want a Mode change to apply to all sessions and subagent sessions in the current location, so that the location has one consistent active Mode.
9. As an OpenCode user, I want a Mode change to affect only permission checks that have not yet been evaluated, so that a pending approval keeps the Policy that produced it.
10. As an OpenCode user, I want cancelling the picker to leave the active Mode unchanged, so that opening the command cannot change permissions accidentally.
11. As an OpenCode user, I want selecting the already active Mode to leave behavior unchanged, so that repeated selections are harmless.
12. As an OpenCode user, I want the server to validate a selected Mode before activating it, so that an unusable Policy cannot silently replace the current one.
13. As an OpenCode user, I want an invalid selected Mode to leave the current Mode active and show “Configuration invalid for mode <name>,” so that I know why my choice did not take effect.
14. As an OpenCode user, I want a picker opened against invalid loaded configuration to say “Configuration invalid,” so that invalid configuration is not confused with an empty one.
15. As an OpenCode user, I want the picker to say “No modes configured” when the loaded policy configuration contains no Modes, so that I understand why there is nothing to select.
16. As an OpenCode user, I want a missing policy configuration not to fail or unload the server plugin, so that its permission hook continues protecting shell calls.
17. As an OpenCode user, I want shell calls to require approval when no Modes are configured, so that an absent Policy does not silently permit shell execution.
18. As an OpenCode user, I want the approval reasons to say “No modes configured; defaulting to ask.”, so that I understand why approval is required.
19. As an OpenCode user, I want the existing bullets naming the missing global, project, and local policy-file locations to remain in the approval reasons, so that I know where to add a Policy.
20. As an OpenCode user, I want an explicit OpenCode deny to remain a deny even when no Mode is configured, so that the plugin does not weaken an existing denial.
21. As an OpenCode user, I want an OpenCode deny to remain final when a temporary Mode is selected, so that the picker does not bypass OpenCode's explicit restrictions.
22. As an OpenCode user, I want a temporary Mode choice not to modify any policy or OpenCode configuration file, so that using the picker cannot persist an unintended setting.
23. As an OpenCode user, I want a server restart or plugin reload to restore the configured `mode` option, so that the temporary override does not survive its in-memory lifetime.
24. As an OpenCode user, I want startup to use the configured `mode` option and fall back to `default` when no option is set, so that existing setup behavior remains intact.
25. As an OpenCode user, I want policy-file edits made while the server is running to remain outside this feature, so that the picker has a clear boundary and does not imply hot reload support.
26. As an OpenCode user, I want no success toast after selecting a Mode, so that switching does not add unnecessary notifications.
27. As an OpenCode user, I want no startup toast or plugin failure when Modes are absent, so that missing configuration is reported in context rather than competing with unrelated plugin notifications.
28. As an OpenCode user, I want the slash command to be available when the plugin's TUI/CLI entry is loaded, so that the UI command remains separate from server-side permission enforcement.
29. As an OpenCode user, I want the existing TUI ask banner to display the new no-Mode reason while approval is pending, so that I can see the reason in the supported TUI surface.

## Implementation Decisions

- The server plugin remains active when no policy files are present. It keeps the existing no-Policy `ask` behavior instead of throwing during setup; throwing would remove the permission hook and leave shell behavior to OpenCode's own rules.
- The initial Mode remains the plugin's configured `mode` option, defaulting to `default`. A temporary location-scoped override is kept only in server memory and is not written through OpenCode configuration or plugin storage.
- The server plugin exposes a typed RPC contract for the TUI entry to read the loaded Mode list and current Mode and to request a Mode change. The shared contract is consumable by both plugin entries.
- The RPC operates on the current session's location. The server maintains one active temporary Mode per location, shared by all sessions and subagents in that location.
- The server reads and merges policy files at setup as it does today. The picker lists the loaded snapshot; changing policy files on disk does not hot-reload them.
- The server validates that a requested Mode exists and validates its effective bash Policy with the engine before atomically updating the active Mode. Invalid choices do not change current state. Engine availability failures use the existing engine failure behavior rather than being treated as a policy-format error.
- The permission hook reads the active Mode for each new permission evaluation. A Mode already captured by a permission evaluation is not changed retroactively.
- When no policy files contribute Modes, the server reports an empty Mode list to the TUI. The TUI presents a picker-style empty-state modal reading “No modes configured”; it does not show a startup toast.
- When no policy files contribute Modes, the existing permission hook sets non-denied shell requests to `ask`. It prepends “No modes configured; defaulting to ask.” to the existing missing-location reasons. An explicit OpenCode `deny` remains unchanged.
- Invalid loaded policy configuration is represented separately from an absent configuration. The command displays “Configuration invalid”; invalid shell Policy continues to use the existing fail-closed permission behavior.
- For a configured but invalid candidate Mode, the command leaves the active Mode unchanged and reports “Configuration invalid for mode <name>.” Selecting a valid Mode closes the picker without a success toast.
- The command is registered on the TUI/CLI keymap's `global` layer so it remains discoverable across input modes, and is available only when that entry is loaded. The server plugin remains responsible for permission checks.

## Testing Decisions

- Good tests assert user-visible and permission-hook behavior: picker options and active selection, RPC results, selected Policy passed to the engine, permission effect and reason, and unchanged state after invalid or cancelled selections. Tests should not assert internal map shapes or helper-call order.
- Test the server plugin through its existing fake OpenCode context and stub engine. Extend that harness only as needed to register and invoke the RPC, then verify a Mode change affects later permission evaluations and that no-Mode requests ask with the expected reasons.
- Test the TUI entry through its existing fake terminal context and render harness. Mock the client RPC and dialog APIs to verify global-layer command registration, picker options, active Mode, empty-state modal, invalid-configuration display, and selection/cancellation behavior.
- Do not add a bespoke harness that boots or communicates with a running OpenCode server for this feature. Keep tests inside the repository's existing test files and fake contexts.
- Record a full runtime test against an actual OpenCode server and TUI as future work; it is not an acceptance gate for this feature.
- Prior art is the server plugin harness and stub engine used by the permission-verdict and setup tests, plus the TUI render harness and ask-banner tests.

## Out of Scope

- Persisting a Mode selected in the picker.
- Editing OpenCode configuration or policy files from the picker.
- Hot-reloading policy files while OpenCode is running.
- Mode descriptions, aliases, or a new policy-file schema.
- A startup toast or failing/unloading the server plugin when no Modes are configured.
- A success toast after a Mode is selected.
- A test that launches or interacts with a real OpenCode server; future runtime verification is noted separately.
- Changing how OpenCode's own permission rules interact with explicit denies.

## Further Notes

- The project's glossary defines **Mode** as a named choice of bash Policy. OpenCode's own “policy” terminology is distinct.
- The current no-policy behavior already asks for approval and sends a branded reason message. The TUI ask banner renders these reason-bearing asks; keep that surface consistent with the existing ADR that separates ask reasons from model-visible transcript content.
- The TUI and server entries are separate plugin contexts. The slash command requires the TUI/CLI entry to be loaded, and permission enforcement requires the server entry to be active for the location.
- The RPC-based temporary override deliberately avoids both a configuration write and a server-plugin setup failure. Missing configuration remains an ask state rather than removing the permission hook.
- A future feature may add policy-file hot reload. It should define how changes to the active Mode and pending permission requests interact before implementation.
