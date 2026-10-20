# 08: Command capture

**What to build:** On the shell tool's `execute.before` hook, record the full command line keyed by call ID. Remove the entry when the call finishes, through the matching after hook. Apply the result from ticket 02.

**Blocked by:** 02 (Spike: command capture), 05 (Test harness and engine lookup)

**Status:** resolved

- [x] After the before hook fires, the command is retrievable by call ID
- [x] The entry is removed when the call finishes
- [x] Calls to tools other than shell are not recorded
- [x] The command is recorded as written, including pipes, `&&`, and redirections
