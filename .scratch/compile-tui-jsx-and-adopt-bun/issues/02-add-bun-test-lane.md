# 02: Add a Bun test lane alongside Vitest

**What to build:** Contributors can run a small Bun test lane alongside the existing Vitest suite, proving that Bun setup, module fakes, and Vite+ task orchestration work before test suites move over.

**Blocked by:** 01 — Switch repository installs to Bun through Vite+.

**Status:** ready-for-agent

- [ ] A Bun test command runs through the package scripts and can be invoked by Vite+.
- [ ] Bun-specific setup and host-runtime fakes are isolated from the existing Vite+ test configuration.
- [ ] At least one representative existing behavior test runs under Bun.
- [ ] The aggregate package test task runs both the existing Vitest lane and the Bun lane.
- [ ] The existing Vitest suite and `vp check` remain green; no existing suite is migrated in this ticket.
