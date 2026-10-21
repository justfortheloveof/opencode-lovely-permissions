# 05: Retire Vitest after all tests migrate

**What to build:** Contributors run the complete repository test suite through Bun, with Vite+ continuing to orchestrate the package script and perform checks.

**Blocked by:**

- 03 — Move policy and engine tests to Bun.
- 04 — Move plugin and package-entry tests to Bun.

**Status:** resolved

- [x] All existing test suites run under Bun with their behavioral coverage preserved.
- [x] The package test script runs Bun's test runner with per-file isolation and can be invoked as `vp run test`.
- [x] The aggregate test script no longer invokes Vitest.
- [x] Vite+-specific test aliases and setup, unused Vitest-only dependencies, and the temporary dual-runner configuration are removed.
- [x] `vp check` and the full Bun test script pass.

## Comments

- `bun install --frozen-lockfile`: passed.
- `vp run test`: 12 files / 152 tests passed; no skipped or duplicate suites.
- `vp check`: formatting, lint, and type checks passed.
- Removed the Vitest test config, aliases, setup, and direct coverage dependency; no Vitest-only imports remain in test sources.
