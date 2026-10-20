# 06: Engine client

**What to build:** Run the engine once per command. Send a protocol version 1 `evaluate` request carrying the whole command line, the resolved bash block, and the mode's top-level wildcard. Read the response's action, reason, and reasons. A response whose protocol field is not 1 is returned as an error. No timeout in this ticket; ticket 13 adds it.

**Blocked by:** 05 (Test harness and engine lookup)

**Status:** ready-for-agent

- [x] The request contains the whole command line, the bash block, and the top-level wildcard, checked through the stub's recording
- [x] Action, reason, and reasons are returned as received
- [x] A response with the wrong protocol version is returned as an error, not as a verdict
- [x] The engine is started once per call, checked by the stub's invocation count
