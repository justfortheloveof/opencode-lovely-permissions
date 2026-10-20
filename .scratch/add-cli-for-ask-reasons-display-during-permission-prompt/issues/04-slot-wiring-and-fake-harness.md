Status: resolved

# 04: Slot wiring and the fake terminal harness

**Blocked by:** 03 (Root-view banner rule)

**What to build:** The terminal entry's setup registers the composer-top slot. The slot reads its session ID from its input, gathers that session's pending asks through the terminal context, passes them to the rule, and renders the result with the brand label. Add a fake terminal-client harness modeled on the server harness. It records the registered slot and feeds fake session data and pending asks.

**Acceptance criteria:**
- [x] Setup registers the composer-top slot.
- [x] The slot takes the session ID from its input.
- [x] For a branded first ask, the slot shows the rule's output verbatim.
- [x] The fake harness sits beside the server harness. It is the only new test seam, along with the rule.
- [x] Unit tests only. No OpenCode app run.

## Comments

- 2026-10-20: Wired the composer-top slot to read the viewed session's pending permissions and render the pure banner rule's message. Added a fake terminal context and slot tests. Full tests (11 files / 140 tests) and `pnpm check` passed. No OpenCode app run was performed.
