Status: ready-for-agent

# 11: Ship the docs

**Blocked by:** 10 (In-app check)

**What to build:** The README tells terminal-machine operators to add the package to `cli.json`, and drops the known-limitation line about ask prompts. The "Remote servers" section stays. The wording reflects ticket 10; it must not imply that automatic server-listed terminal plugin loading was verified, because ticket 09 was waived.

**Acceptance criteria:**
- [ ] The README has the `cli.json` instruction for terminal machines.
- [ ] The known-limitation line about ask prompts is gone.
- [ ] The remote-server section still says every server that runs commands must load the plugin.

## Comments

- 2026-10-20: Ticket 09 was waived by the user because no remote server is available or required. Do not claim remote TUI loading was tested.
