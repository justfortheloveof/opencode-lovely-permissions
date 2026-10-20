Status: ready-for-human

# 10: In-app check

**Blocked by:** 05 (Subagent asks in parent's banner), 06 (Banner follows the pending list), 07 (Sync pending asks on mount), 08 (A failing banner stays silent)

**What to build:** Check the full behaviour in the OpenCode app against the spec's user stories. The user runs this check. An agent does not.

**Acceptance criteria:**
- [ ] A branded ask in a root session shows its reasons above the composer, verbatim, one bullet per reason.
- [ ] The banner clears when the ask is answered, and the next pending ask shows if one is waiting.
- [ ] A subagent's ask shows in the parent's banner. The subagent's own session shows no banner.
- [ ] Another tool's ask shows no banner.
- [ ] Autoaccept: the banner may flash briefly, with no error.
- [ ] Reconnecting while an ask is pending: the banner recovers.
- [ ] A denied command's reasons still appear when its timeline row is expanded.
- [ ] With the composer panel open, the banner stays visible. This is accepted, not a bug.
- [ ] Record the results under `## Comments` at the bottom of this file.
