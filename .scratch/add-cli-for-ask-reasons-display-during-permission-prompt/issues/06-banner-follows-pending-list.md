Status: resolved

# 06: Banner follows the pending list

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** The banner updates as pending asks change. When the shown ask is answered, the banner clears. If another ask is pending, the banner shows that ask's message.

**Acceptance criteria:**
- [x] Answering the shown ask clears the banner when no other branded first ask is pending.
- [x] When another ask is pending after the answer, the banner shows its message.
- [x] Tests change the fake pending list, and the banner follows. No OpenCode app run.

## Comments

- 2026-10-20: Made the rendered text child reactive to the current pending list. The fake terminal test mutates the list and observes the same banner advance to the next ask and clear when empty. Full tests (11 files / 141 tests) and `pnpm check` passed. No OpenCode app run was performed.
