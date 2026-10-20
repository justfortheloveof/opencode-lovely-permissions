Status: resolved

# 08: A failing banner stays silent

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** If reading the pending asks or running the rule throws, the slot shows nothing, and the error does not escape the slot. This ticket changes only the terminal half. The server half is untouched.

**Acceptance criteria:**
- [x] A throwing data read leaves the slot empty and throws nothing.
- [x] A throwing rule leaves the slot empty and throws nothing.
- [x] The server tests pass unchanged.
- [x] Unit tests only. No OpenCode app run.
