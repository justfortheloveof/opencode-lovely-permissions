# 13: Per-command failures

**What to build:** If the engine does not answer one command within 5 seconds, kill it and use the `error` level from the bash block for that command. If one command gets a parse error or an engine error, use the `error` level with the engine's message as the reason, shown in the same bullet format as ask and deny. Other commands are not affected.

**Blocked by:** 09 (Allow, ask, and deny one command)

**Status:** ready-for-agent

- [x] A stub that runs past 5 seconds is killed, and the verdict is the bash block's `error` level
- [x] A stub that returns an error for one command gives the `error` level with the engine's message as the reason
- [x] The next command after a failure is evaluated normally
- [x] The timeout test waits the full 5 seconds
