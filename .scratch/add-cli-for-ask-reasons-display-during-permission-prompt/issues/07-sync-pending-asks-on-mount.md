Status: resolved

# 07: Sync pending asks on mount

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** When the terminal slot mounts, it syncs the pending permission requests for the viewed session and its family. The banner then recovers after a reconnect.

**Acceptance criteria:**
- [x] On mount, the slot syncs the viewed session and each family member.
- [x] After the sync, the banner shows the synced asks.
- [x] Unit tests check the recorded sync calls. No OpenCode app run.

## Answer

The terminal slot now syncs permission requests for the viewed session and its current family when mounted. The slot reads the viewed session's pending requests for banner display after sync. The fake terminal harness records sync calls and supplies synced requests for the unit test.

Validation: `pnpm test` (141 tests), `pnpm check`, and `git diff --check` passed. No OpenCode app run.
