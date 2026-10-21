Status: resolved

# 02: Terminal entry loads from the package

**Blocked by:** None (can start immediately)

**What to build:** The package exposes a terminal entry next to the server entry, so OpenCode can load it. For now the entry's setup function registers nothing. Add the optional peers and dev pins from the spec. Keep the plugin dependency at 2.0.30. Ship the entry as `.ts` with explicit host-runtime `jsx()` calls; do not include raw JSX syntax.

**Acceptance criteria:**
- [x] The package exports `./tui` to `src/tui.ts`, and the manifest ships it.
- [x] `@opentui/core` and `@opentui/solid` (>= 0.5.17) and `solid-js` (>= 1.9.0) are optional peers.
- [x] Dev dependencies pin `@opentui/core` 0.5.17, `@opentui/solid` 0.5.17, and `solid-js` 1.9.15.
- [x] `@opencode/plugin` stays pinned at 2.0.30.
- [x] The placeholder uses an explicit `jsx()` call (and can use `jsxs()` for multiple children) and imports both the TUI plugin SDK and OpenTUI JSX runtime through their host virtual runtime-module IDs.
- [x] The terminal entry contains no raw JSX. Do not add React, a JSX transform, or local runtime dependencies to hide an entry-loading failure.
- [x] The host virtual runtime-module imports are exercised through the package-entry test using test-only fakes/aliases, without a production workaround.
- [x] The package-entry test imports the public `opencode-lovely-bash-permissions/tui` subpath and checks the export, shipped entry, and optional peers without requiring a JSX transform.
- [x] `Host.resolve` resolves a local package directory's terminal entry to the shipped root `tui.ts` shim, while the public `./tui` export remains `src/tui.ts`.
- [x] The server tests pass unchanged.

## Comments

- 2026-10-20 (initial diagnosis): `pnpm test -- tests/package-entry.test.ts` failed while importing `src/tui.tsx` because it tried to load `react/jsx-dev-runtime`; no tests ran. At that point the partial changes were left uncommitted pending direction.
- 2026-10-20 (resumed): `vite.config.ts` and `tsconfig.json` have no Solid JSX transform. More importantly, installed `@opentui/solid@0.5.17/scripts/solid-plugin.js` excludes files under `node_modules`, so a Vite-only Solid transform would not protect an npm-installed entry. OpenCode issue [#39986](https://github.com/anomalyco/opencode/issues/39986) and related [#50095](https://github.com/anomalyco/opencode/issues/50095) document the same failure and the host virtual-module/no-JSX workaround. The entry is now `src/tui.ts`, uses explicit `jsx()` and host runtime IDs `opentui:runtime-module:%40opencode%2Fplugin%2Ftui` and `opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime`; test-only aliases fake those IDs while importing the public package subpath. Remote and in-app validation are not claimed; tickets 09 and 10 remain human checks.
- 2026-10-20: Acceptance checks passed: focused package-entry test (4 tests), full test suite (9 files / 132 tests), `pnpm check`, and `pnpm pack --dry-run` (includes `src/tui.ts`). Ticket 02 is resolved. Tickets 09/10 remain ready-for-human; no remote or in-app validation was performed.
- 2026-10-20: Ticket 10 follow-up found that `Host.resolve` in pinned `@opencode/plugin` 2.0.30 probes `<local-directory>/tui`; the package's `./tui` export does not satisfy that directory lookup. Added a root `tui.ts` re-export shim and shipped it, while preserving `./tui` as `src/tui.ts`. The package-entry regression exercises the host resolver. See the updated spec's Implementation Decisions and Testing Decisions.
