Status: resolved

# 10: In-app check

**Blocked by:** 05 (Subagent asks in parent's banner), 06 (Banner follows the pending list), 07 (Sync pending asks on mount), 08 (A failing banner stays silent)

**What to build:** Check the full behaviour in the OpenCode app against the spec's user stories. The user runs this check. An agent does not.

**Acceptance criteria:**
- [x] A branded ask in a root session shows its reasons above the composer, verbatim, one bullet per reason.
- [x] The banner clears when the ask is answered, and the next pending ask shows if one is waiting.
- [x] A subagent's ask shows in the parent's banner. The subagent's own session shows no banner.
- [ ] Another tool's ask shows no banner.
- [x] Autoaccept: the banner may flash briefly, with no error.
- [x] Reconnecting while an ask is pending: the banner recovers.
- [x] A denied command's reasons still appear when its timeline row is expanded.
- [x] With the composer panel open, the banner stays visible. This is accepted, not a bug.
- [x] Record the results under `## Comments` at the bottom of this file.

## Comments

- 2026-10-20: User's local in-app results: (1) root ask: no banner; (2) no banner for the next ask; (3) initially answered "yes," then clarified no banner appeared in either tested case; treat as failed; (4) file write ran without asking, so the non-shell ask case was not exercised; (5) no banner in autoaccept, error status unclear; (6) ask remained pending after reconnect but no banner appeared; (7) denial reasons appeared when the row was expanded; (8) no ask banner was seen with the composer open. Ticket remains open; root, subagent, and reconnect banner behavior failed; non-shell and autoaccept results need clarification.
- 2026-10-20: Config check: server `opencode.json` and terminal `cli.json` both list the local checkout; the global policy has `default.*: ask` and one deny pattern; the user restarted the service. Requested startup plugin-load logs to distinguish a TUI entry load failure from an unbranded/non-plugin ask.
- 2026-10-20: Inspected `/home/alx/.local/share/opencode/log/opencode.log` as requested. It has repeated server-role loads of the package's `index.ts`, but no terminal-role load of `src/tui.ts` and no matching TUI load error. This suggests the terminal entry did not activate, though this log may omit successful CLI plugin loads; confirmation is still needed.
- 2026-10-20: After the root `tui.ts` shim was merged in `f47756d`, the user restarted and retested a root shell ask. The branded message appeared above the composer: `[♡ perms: 💛 REQUIRES-USER-APPROVAL]` followed by one bullet, `"echo" command is not allowlisted; wildcard policy is ask`. This passes the root-ask check; one reason correctly produces one bullet.
- 2026-10-20: User confirmed the remaining behavior checks (answer/next/clear, subagent parent/child, autoaccept, local reconnect, and composer-open) are all well after the fix. The non-shell ask case is N/A: the file write ran without asking in the user's Omarchy setup, so there was no non-shell permission prompt to inspect. User accepted that case as N/A.
- 2026-10-20: Resolver finding: pinned `@opencode/plugin` 2.0.30 `Host.resolve({ directory })` resolves a local directory's TUI entry from `<directory>/tui`, without using the package's `./tui` export. The checkout had `src/tui.ts` but no root `tui.ts`, explaining why `/plugins` omitted the local plugin row. Added and shipped a root re-export shim; see ticket 02 and the spec's Implementation Decisions/Testing Decisions. This fix is not an in-app validation: the user must restart/retest, so ticket 10 remains open.
