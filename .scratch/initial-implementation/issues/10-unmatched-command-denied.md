# 10: Unmatched command is denied

**What to build:** If a permission request arrives with no captured command for its source, deny it with a message saying the command could not be matched. The plugin never allows a call it cannot match, and it does not call the engine for one.

**Blocked by:** 09 (Allow, ask, and deny one command)

**Status:** ready-for-agent

- [ ] A permission request with no captured command gets the deny effect
- [ ] The message uses the deny label and the closing sentence, and says the command could not be matched
- [ ] The engine is not called, checked by the stub's invocation count
