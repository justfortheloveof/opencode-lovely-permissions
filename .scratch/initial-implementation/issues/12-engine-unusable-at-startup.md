# 12: Engine unusable at startup

**What to build:** If the engine fails to start, or its protocol version does not match, put the plugin in the blocked state from ticket 11. Every shell call is then denied, with a message that names what failed and how to fix it, without needing logs. A protocol mismatch gets its own message, separate from the policy messages.

**Blocked by:** 11 (Startup policy validation)

**Status:** ready-for-agent

- [ ] An engine that exits on start denies every shell call, with a message naming the failure and the fix
- [ ] A protocol version mismatch denies every shell call, with its own message naming the fix
- [ ] The blocked state applies to every shell call for the rest of the session
- [ ] The denial uses the auto-rejected label and the closing sentence
