# 01: Switch the active Mode from the TUI picker

**What to build:** Let an OpenCode user invoke `/lovely-permissions-cfg`, discover the configured Modes for the current location, and temporarily switch the Mode used by future shell permission checks. The picker marks the current Mode. A successful selection applies immediately to all sessions in the location, does not persist, and produces no success toast. Document how to load and use the TUI command.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The TUI entry registers `/lovely-permissions-cfg` without requiring arguments and exposes it when that entry is loaded.
- [ ] The picker lists the distinct Mode names from the server's loaded, merged configuration for the current location and marks the active Mode.
- [ ] The server and TUI exchange Mode-list, active-Mode, and change requests through a typed RPC contract.
- [ ] Selecting a configured, engine-valid Mode changes the active Mode immediately for future permission evaluations across all sessions and subagent sessions in that location.
- [ ] The server validates a requested Mode before changing active state. Invalid requests leave the previously active Mode unchanged.
- [ ] A Mode already captured by an in-progress permission evaluation is not changed retroactively.
- [ ] Cancelling the picker leaves the active Mode unchanged; selecting the active Mode is harmless.
- [ ] The active override is held in server memory only. No policy or OpenCode configuration is written; plugin reload or server restart restores the configured `mode` option, falling back to `default` when absent.
- [ ] Existing explicit OpenCode denies remain final.
- [ ] Tests cover the server behavior through the existing fake plugin context and stub engine, and the TUI behavior through the existing fake terminal context with mocked RPC and dialog APIs. No test starts or contacts a real OpenCode server.
- [ ] User-facing documentation explains the command and the separate TUI/CLI loading requirement.
