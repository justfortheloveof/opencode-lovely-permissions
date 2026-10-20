Status: ready-for-agent

# 03: Root-view banner rule

**Blocked by:** 01 (Move the brand labels to a leaf module), 02 (Terminal entry loads from the package)

**What to build:** A pure rule that picks what the banner shows for a root session. It takes the viewed session's pending asks in order. It returns the first ask's message if that message starts with the ask brand label and has at least one reason. Otherwise it returns nothing. The slot calls this rule, and the rule has no UI dependency.

**Acceptance criteria:**
- [ ] Returns the first ask's message verbatim when it is branded and has reasons.
- [ ] Returns nothing when there are no pending asks.
- [ ] Returns nothing when the first ask lacks the brand label, even if a later ask has it. The prompt shows only the first ask.
- [ ] Returns nothing when the first ask has no reasons (its message is the label alone).
- [ ] Returns the missing-policy ask's message, with its three locations.
- [ ] Unit tests only. No OpenCode app run.
