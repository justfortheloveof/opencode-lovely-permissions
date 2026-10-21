# 06: Build and package the TUI from Solid JSX

**What to build:** OpenCode users keep the existing Ask banner behavior, while the maintainer authors its TUI in Solid JSX and packages a compiled JavaScript entry that uses OpenCode's host runtime.

**Blocked by:** 05 — Retire Vitest after all tests migrate.

**Status:** ready-for-agent

- [ ] The terminal component is authored with Solid JSX and transformed with OpenTUI's supported Bun transform; raw JSX is not left in the entry OpenCode loads.
- [ ] OpenCode plugin, OpenTUI Solid, and Solid runtime imports remain external for host resolution; no React runtime is introduced.
- [ ] The compiled terminal entry is selected by the public TUI export and local directory shim, is included in the package, and is generated during packing rather than committed.
- [ ] A local checkout can build the terminal entry before OpenCode loads it; the server entry remains source-based and server behavior is unchanged.
- [ ] The TUI behavior seam uses the fake terminal context and OpenTUI's headless renderer to assert visible Ask banner text or absence, not JSX object internals.
- [ ] Existing behavior cases remain covered: pending-ask changes, family ordering, parent/subagent visibility, synchronization, failures, and cleanup.
- [ ] Static build and package checks verify the selected compiled entry and expected external host imports. Do not claim that OpenCode runtime loading was verified by these checks.
- [ ] `vp check`, the full Bun suite, and package packing pass.
