# 06: Build and package the TUI from Solid JSX

**What to build:** OpenCode users keep the existing Ask banner behavior, while the maintainer authors its TUI in Solid JSX and packages a compiled JavaScript entry that uses OpenCode's host runtime.

**Blocked by:** 05 — Retire Vitest after all tests migrate.

**Status:** resolved

- [x] The terminal component is authored with Solid JSX and transformed with OpenTUI's supported Bun transform; raw JSX is not left in the entry OpenCode loads.
- [x] OpenCode plugin, OpenTUI Solid, and Solid runtime imports remain external for host resolution; no React runtime is introduced.
- [x] The compiled terminal entry is selected by the public TUI export and local directory shim, is included in the package, and is generated during packing rather than committed.
- [x] A local checkout can build the terminal entry before OpenCode loads it; the server entry remains source-based and server behavior is unchanged.
- [x] The TUI behavior seam uses the fake terminal context and OpenTUI's headless renderer to assert visible Ask banner text or absence, not JSX object internals.
- [x] Existing behavior cases remain covered: pending-ask changes, family ordering, parent/subagent visibility, synchronization, failures, and cleanup.
- [x] Static build and package checks verify the selected compiled entry and expected external host imports. Do not claim that OpenCode runtime loading was verified by these checks.
- [x] `vp check`, the full Bun suite, and package packing pass.

## Comments

- 2026-10-21: Built `dist/tui.js` from `src/tui.tsx` with OpenTUI 0.6.6's Bun plugin. The artifact externalizes the OpenCode plugin, OpenTUI Solid, and Solid imports; the public export and local shim select it. `prepack` rebuilds the ignored artifact.
- 2026-10-21: Converted TUI behavior coverage to the real Solid runtime and OpenTUI `testRender` visible-frame assertions. Server implementation and verdict behavior were not changed.
- 2026-10-21: `bun run build`, `vp check`, and `vp run test` passed (155 tests). `bun pm pack --destination /tmp/opencode` rebuilt after the generated entry was removed and included `dist/tui.js` in the tarball.
- 2026-10-21: Static checks do not verify OpenCode's runtime load of this generated artifact; runtime loading remains unverified.
