Status: needs-info

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

## Comments

- 2026-10-20: Blocked by the existing test toolchain. `pnpm test -- tests/package-entry.test.ts` fails while importing `src/tui.tsx` because it tries to load `react/jsx-dev-runtime`; no tests ran. No workaround was applied, and no changes were committed or merged. Partial changes remain uncommitted in the `impl/ticket-02-terminal-entry` worktree pending direction.
