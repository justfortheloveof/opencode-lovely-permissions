# 03: Move policy and engine tests to Bun

**What to build:** Contributors can run the policy, command-capture, and engine behavior tests under Bun while the remaining plugin tests continue to run under Vitest.

**Blocked by:** 02 — Add a Bun test lane alongside Vitest.

**Status:** ready-for-agent

- [ ] The Ask banner selection rule, command capture, mode selection, and policy-layer suites run under Bun and retain their existing behavioral coverage.
- [ ] The engine client, engine, and stub-engine suites run under Bun, including child-process behavior and error assertions.
- [ ] Migrated suites are run by the Bun lane, and the remaining Vitest suites stay green without duplicate or silently skipped tests.
- [ ] `vp check` remains green.
