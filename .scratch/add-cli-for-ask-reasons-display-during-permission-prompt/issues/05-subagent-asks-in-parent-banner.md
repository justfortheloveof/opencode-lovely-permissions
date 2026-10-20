Status: ready-for-agent

# 05: Subagent asks in the parent's banner

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** In a root session, the slot gathers the viewed session's pending asks first, then the pending asks from its family's other sessions, in family order. The rule receives that combined list. A session that has a parent shows no banner, as the prompt does.

**Acceptance criteria:**
- [ ] A subagent's ask shows in the parent's banner when it is first in order.
- [ ] The viewed session's own asks come before subagent asks.
- [ ] Subagent asks follow family order.
- [ ] A session that has a parent shows nothing, even when it has pending asks of its own.
- [ ] Unit tests only. No OpenCode app run.
