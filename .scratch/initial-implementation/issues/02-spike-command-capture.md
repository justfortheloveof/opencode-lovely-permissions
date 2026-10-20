# 02: Spike: command capture

**What to build:** Answer whether the shell tool's `execute.before` hook fires before the permission request, carries the same call ID, and receives the full command line. Run the check against the installed OpenCode 2.0.30 in a throwaway project outside the repository. Record the result in the spec's Further Notes. If any answer is no, amend the spec's command capture decision before ticket 08 starts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Recorded: whether `execute.before` fires before the permission request
- [x] Recorded: whether the call ID matches between the before hook and the permission request
- [x] Recorded: whether the captured string is the full command, including pipes, `&&`, and redirections
- [x] If any answer is no, the spec's command capture decision is amended
