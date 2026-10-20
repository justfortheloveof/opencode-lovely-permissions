Status: ready-for-agent

# 04: Slot wiring and the fake terminal harness

**Blocked by:** 03 (Root-view banner rule)

**What to build:** The terminal entry's setup registers the composer-top slot. The slot reads its session ID from its input, gathers that session's pending asks through the terminal context, passes them to the rule, and renders the result with the brand label. Add a fake terminal-client harness modeled on the server harness. It records the registered slot and feeds fake session data and pending asks.

**Acceptance criteria:**
- [ ] Setup registers the composer-top slot.
- [ ] The slot takes the session ID from its input.
- [ ] For a branded first ask, the slot shows the rule's output verbatim.
- [ ] The fake harness sits beside the server harness. It is the only new test seam, along with the rule.
- [ ] Unit tests only. No OpenCode app run.
