Status: resolved

# 03: Root-view banner rule

**Blocked by:** 01 (Move the brand labels to a leaf module), 02 (Terminal entry loads from the package)

**What to build:** A pure rule that picks what the banner shows for a root session. It takes the viewed session's pending asks in order. It returns the first ask's message if that message starts with the ask brand label and has at least one reason. Otherwise it returns nothing. The slot calls this rule, and the rule has no UI dependency.

**Acceptance criteria:**
- [x] Returns the first ask's message verbatim when it is branded and has reasons.
- [x] Returns nothing when there are no pending asks.
- [x] Returns nothing when the first ask lacks the brand label, even if a later ask has it. The prompt shows only the first ask.
- [x] Returns nothing when the first ask has no reasons (its message is the label alone).
- [x] Returns the missing-policy ask's message, with its three locations.
- [x] Unit tests only. No OpenCode app run.

## Comments

- 2026-10-20: Added the UI-free `pickAskBannerMessage` rule and pure unit tests. Focused tests (6), full tests (10 files / 138 tests), and `pnpm check` passed. No OpenCode app run was performed.
