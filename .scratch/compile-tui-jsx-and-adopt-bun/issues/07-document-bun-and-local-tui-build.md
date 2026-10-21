# 07: Document the Bun and local TUI build workflow

**What to build:** Contributors can follow the final dependency-install, check, test, build, and local OpenCode loading workflow, while package users understand that Bun is a development/build prerequisite rather than a runtime requirement.

**Blocked by:** 06 — Build and package the TUI from Solid JSX.

**Status:** ready-for-agent

- [ ] The README documents the verified Bun/Vite+ commands for install, check, test, build, and local checkout loading.
- [ ] The README explains that a local checkout must be built before OpenCode loads its terminal entry.
- [ ] The README no longer describes the repository as pnpm-managed or as having no build step.
- [ ] The README does not claim runtime or remote-loading verification that was not performed; the existing remote-loading limitation remains clear.
- [ ] The README makes clear that published package users do not need Bun at runtime.
