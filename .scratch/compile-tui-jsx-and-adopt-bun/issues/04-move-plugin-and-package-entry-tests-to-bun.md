# 04: Move plugin and package-entry tests to Bun

**What to build:** Contributors can run the server-plugin, terminal-plugin, and package-entry behavior tests under Bun while the remaining non-plugin tests continue to run under Vitest.

**Blocked by:** 02 — Add a Bun test lane alongside Vitest.

**Status:** resolved

- [x] Server integration and permission-verdict tests run under Bun and preserve their current allow, ask, and deny assertions.
- [x] Terminal-plugin tests run under Bun with the fake session/permission context, preserving ask selection, family order, synchronization, subagent visibility, failure handling, and slot cleanup coverage.
- [x] The module-mock behavior for TUI rule failures is preserved under Bun without relying on Vitest-only mock hoisting.
- [x] Package-entry tests continue to verify host directory resolution and package exports.
- [x] Migrated suites are run by the Bun lane, and the remaining Vitest suites stay green without duplicate or silently skipped tests.
- [x] `vp check` remains green.

## Answer

Moved the server plugin, permission-verdict, terminal plugin, TUI rule-failure, and package-entry suites to the Bun lane. The Bun preload uses Bun-specific lifecycle and sandbox support, and the rule-failure test installs its module mock before dynamically importing the plugin harness.

## Comments

- After merging integration tip `a88368d`, `bun test --parallel ./tests-bun`: 12 files / 152 tests passed.
- `vp check`: formatting, lint, and type checks passed.
- `vp run test` currently stops at `vp test` with “No test files found” because tickets 03 and 04 have moved all suites to Bun; ticket 05 retires the empty Vitest lane.
