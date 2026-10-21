# 04: Move plugin and package-entry tests to Bun

**What to build:** Contributors can run the server-plugin, terminal-plugin, and package-entry behavior tests under Bun while the remaining non-plugin tests continue to run under Vitest.

**Blocked by:** 02 — Add a Bun test lane alongside Vitest.

**Status:** ready-for-agent

- [ ] Server integration and permission-verdict tests run under Bun and preserve their current allow, ask, and deny assertions.
- [ ] Terminal-plugin tests run under Bun with the fake session/permission context, preserving ask selection, family order, synchronization, subagent visibility, failure handling, and slot cleanup coverage.
- [ ] The module-mock behavior for TUI rule failures is preserved under Bun without relying on Vitest-only mock hoisting.
- [ ] Package-entry tests continue to verify host directory resolution and package exports.
- [ ] Migrated suites are run by the Bun lane, and the remaining Vitest suites stay green without duplicate or silently skipped tests.
- [ ] `vp check` remains green.
