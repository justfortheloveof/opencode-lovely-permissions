# 09: Allow, ask, and deny one command (tracer bullet)

**What to build:** The permission evaluate hook for the shell action. It takes the captured command, asks the engine for a verdict, and sets the effect and message. Allow is silent. Ask shows the ask label and bullets. Deny shows the deny label, bullets, and the closing sentence. Reasons appear in the order the engine gave them, one bullet each. The policy's verdict replaces OpenCode's computed effect, in both directions. An explicit OpenCode deny is left in place, as confirmed in the spike. Every message is built in one place. The text matches the Pi extension's strings exactly, and the `❤️` brand label includes its variation selector.

**Blocked by:** 03 (Spike: rendering and subagents), 06 (Engine client), 07 (Project policy file), 08 (Command capture)

**Status:** ready-for-agent

- [x] Allow: the allow effect and no message
- [x] Ask: the ask effect, with a message starting `[♡ perms: 💛 REQUIRES-USER-APPROVAL]` and one bullet per reason
- [x] Deny: the deny effect, with a message starting `[♡ perms: ❤️ auto-rejected]`, one bullet per reason, and ending "The tool has not been run."
- [ ] The policy's allow replaces an OpenCode ask, the policy's ask replaces an OpenCode allow, and the policy's deny replaces an OpenCode allow
- [ ] An explicit OpenCode deny is not overridden, as confirmed in the spike
- [x] Every message string is pinned as a literal in the tests
- [x] Multi-line messages follow the spike's rendering result
