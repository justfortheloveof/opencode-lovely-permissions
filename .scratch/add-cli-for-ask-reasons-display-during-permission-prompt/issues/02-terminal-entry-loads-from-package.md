Status: ready-for-agent

# 02: Terminal entry loads from the package

**Blocked by:** None (can start immediately)

**What to build:** The package exposes a terminal entry next to the server entry, so OpenCode can load it. For now the entry's setup function registers nothing. Add the optional peers and dev pins from the spec. Keep the plugin dependency at 2.0.30.

**Acceptance criteria:**
- [ ] The package exports the terminal entry, and the manifest ships it.
- [ ] `@opentui/core` and `@opentui/solid` (>= 0.5.17) and `solid-js` (>= 1.9.0) are optional peers.
- [ ] Dev dependencies pin `@opentui/core` 0.5.17, `@opentui/solid` 0.5.17, and `solid-js` 1.9.15.
- [ ] `@opencode/plugin` stays pinned at 2.0.30.
- [ ] The placeholder defines one Solid component with JSX, so the test run exercises the Solid compile.
- [ ] If the toolchain cannot compile the Solid JSX, stop and report. Do not work around it.
- [ ] The manifest test checks the export, the shipped entry, and the optional peers.
- [ ] The server tests pass unchanged.
