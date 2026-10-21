Status: needs-info

# 10: In-app check

**Blocked by:** 05 (Subagent asks in parent's banner), 06 (Banner follows the pending list), 07 (Sync pending asks on mount), 08 (A failing banner stays silent)

**What to build:** Check the full behaviour in the OpenCode app against the spec's user stories. The user runs this check. An agent does not.

**Acceptance criteria:**
- [ ] A branded ask in a root session shows its reasons above the composer, verbatim, one bullet per reason.
- [ ] The banner clears when the ask is answered, and the next pending ask shows if one is waiting.
- [x] A subagent's ask shows in the parent's banner. The subagent's own session shows no banner.
- [ ] Another tool's ask shows no banner.
- [ ] Autoaccept: the banner may flash briefly, with no error.
- [ ] Reconnecting while an ask is pending: the banner recovers.
- [x] A denied command's reasons still appear when its timeline row is expanded.
- [ ] With the composer panel open, the banner stays visible. This is accepted, not a bug.
- [ ] Record the results under `## Comments` at the bottom of this file.

## Comments

- 2026-10-20: User's local in-app results: (1) root ask: no banner; (2) no banner for the next ask; (3) yes, subagent/parent behavior passed (interpreted from the report); (4) file write ran without asking, so the non-shell ask case was not exercised; (5) reported "no" for autoaccept, meaning needs clarification; (6) ask remained pending after reconnect but no banner appeared; (7) denial reasons appeared when the row was expanded; (8) no ask banner was seen with the composer open. Ticket remains open; root ask and reconnect behavior failed, and other-tool/autoaccept results need clarification.
- 2026-10-20: Needs diagnosis. The manual report does not establish whether the CLI TUI entry loaded or whether the tested ask carried the plugin's branded message. Requesting the OpenCode version, redacted plugin config entries, startup plugin-load logs, and clarification of results 3 and 5.
