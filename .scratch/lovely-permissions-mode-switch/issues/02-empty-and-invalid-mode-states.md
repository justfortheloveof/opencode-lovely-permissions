# 02: Explain empty and invalid Mode states

**What to build:** Make the Mode picker and permission requests explain why a user cannot select a Mode or why approval is required. An empty configuration gets a picker-style “No modes configured” state and keeps the server permission hook active; shell calls ask with a clear reason. Invalid configuration and invalid candidate Modes are reported distinctly without changing the active Mode.

**Blocked by:** 01 (Switch the active Mode from the TUI picker).

**Status:** ready-for-agent

- [ ] With no policy files contributing Modes, the picker displays a picker-style empty state reading “No modes configured.”
- [ ] Missing Modes do not throw during server setup, unload the permission hook, or trigger a startup toast.
- [ ] With no Modes configured, non-denied shell permission requests ask for approval and their reason list starts with “No modes configured; defaulting to ask.”
- [ ] The existing bullets identifying missing global, project, and local policy-file locations remain in the ask message and appear in the existing TUI ask banner.
- [ ] An explicit OpenCode deny remains a deny when no Modes are configured.
- [ ] Invalid loaded configuration is reported in the picker as “Configuration invalid,” rather than as an empty configuration.
- [ ] Selecting a configured Mode whose Policy is rejected by the engine leaves the active Mode unchanged and displays “Configuration invalid for mode <name>.”
- [ ] Invalid loaded Policy continues to use the existing fail-closed permission behavior.
- [ ] Tests cover the permission hook and TUI states using the existing fake contexts and stub engine; no test starts or contacts a real OpenCode server.
