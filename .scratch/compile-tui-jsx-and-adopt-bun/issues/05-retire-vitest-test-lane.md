# 05: Retire Vitest after all tests migrate

**What to build:** Contributors run the complete repository test suite through Bun, with Vite+ continuing to orchestrate the package script and perform checks.

**Blocked by:**

- 03 — Move policy and engine tests to Bun.
- 04 — Move plugin and package-entry tests to Bun.

**Status:** ready-for-agent

- [ ] All existing test suites run under Bun with their behavioral coverage preserved.
- [ ] The package test script runs Bun's test runner with per-file isolation and can be invoked as `vp run test`.
- [ ] The aggregate test script no longer invokes Vitest.
- [ ] Vite+-specific test aliases and setup, unused Vitest-only dependencies, and the temporary dual-runner configuration are removed.
- [ ] `vp check` and the full Bun test script pass.
