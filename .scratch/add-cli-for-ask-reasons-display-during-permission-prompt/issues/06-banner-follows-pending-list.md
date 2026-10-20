Status: ready-for-agent

# 06: Banner follows the pending list

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** The banner updates as pending asks change. When the shown ask is answered, the banner clears. If another ask is pending, the banner shows that ask's message.

**Acceptance criteria:**
- [ ] Answering the shown ask clears the banner when no other branded first ask is pending.
- [ ] When another ask is pending after the answer, the banner shows its message.
- [ ] Tests change the fake pending list, and the banner follows. No OpenCode app run.
