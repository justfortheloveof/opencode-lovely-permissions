Status: ready-for-agent

# 11: Ship the docs

**Blocked by:** 09 (Remote loading check), 10 (In-app check)

**What to build:** The README tells terminal-machine operators to add the package to `cli.json`, and drops the known-limitation line about ask prompts. The "Remote servers" section stays. The wording matches what the checks in tickets 09 and 10 found.

**Acceptance criteria:**
- [ ] The README has the `cli.json` instruction for terminal machines.
- [ ] The known-limitation line about ask prompts is gone.
- [ ] The remote-server section still says every server that runs commands must load the plugin.
