# 03: Move policy and engine tests to Bun

**What to build:** Contributors can run the policy, command-capture, and engine behavior tests under Bun while the remaining plugin tests continue to run under Vitest.

**Blocked by:** 02 — Add a Bun test lane alongside Vitest.

**Status:** resolved

- [x] The Ask banner selection rule, command capture, mode selection, and policy-layer suites run under Bun and retain their existing behavioral coverage.
- [x] The engine client, engine, and stub-engine suites run under Bun, including child-process behavior and error assertions.
- [x] Migrated suites are run by the Bun lane, and the remaining Vitest suites stay green without duplicate or silently skipped tests.
- [x] `vp check` remains green.

## Comments

- Bun 1.4.3 `bun run test`: 76 Vitest tests and 77 Bun tests passed; the seven migrated suites passed all 76 tests in a targeted run. `vp check` passed without warnings.
- The Bun runs exercised spawned engine request/response and error paths plus the stub's `execFileSync` stdin/stdout behavior. Bun's `os.homedir()` stays at the host home after `HOME` changes, so the home-fallback test now passes its fixture home explicitly; production policy behavior is unchanged.
