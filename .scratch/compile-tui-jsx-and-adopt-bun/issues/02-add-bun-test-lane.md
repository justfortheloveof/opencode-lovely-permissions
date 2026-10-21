# 02: Add a Bun test lane alongside Vitest

**What to build:** Contributors can run a small Bun test lane alongside the existing Vitest suite, proving that Bun setup, module fakes, and Vite+ task orchestration work before test suites move over.

**Blocked by:** 01 — Switch repository installs to Bun through Vite+.

**Status:** resolved

- [x] A Bun test command runs through the package scripts and can be invoked by Vite+.
- [x] Bun-specific setup and host-runtime fakes are isolated from the existing Vite+ test configuration.
- [x] At least one representative existing behavior test runs under Bun.
- [x] The aggregate package test task runs both the existing Vitest lane and the Bun lane.
- [x] The existing Vitest suite and `vp check` remain green; no existing suite is migrated in this ticket.

## Answer

Added a separate Bun lane for the branded Ask-banner behavior, with Bun-only host-runtime fakes preloaded from `bunfig.toml`. The package `test` script now runs the unchanged Vitest lane followed by Bun; Vite+ only discovers the existing `tests/` suites.

## Comments

- `vp run test`: 12 Vitest files / 152 tests passed, then the Bun behavior test passed.
- `vp check`: formatting, lint, and type checks passed.
- `bun install --frozen-lockfile --ignore-scripts`: passed with no lockfile changes.
