Status: ready-for-agent

# 07: Sync pending asks on mount

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** When the terminal slot mounts, it syncs the pending permission requests for the viewed session and its family. The banner then recovers after a reconnect.

**Acceptance criteria:**
- [ ] On mount, the slot syncs the viewed session and each family member.
- [ ] After the sync, the banner shows the synced asks.
- [ ] Unit tests check the recorded sync calls. No OpenCode app run.
