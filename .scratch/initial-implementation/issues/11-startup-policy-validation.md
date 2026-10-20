# 11: Startup policy validation

**What to build:** At setup, send the merged bash block to the engine's validate operation. If validation fails, put the plugin in a blocked state in which every shell call is denied. The denial names the offending key and lists the valid keys, and it is shown with the auto-rejected label and the closing sentence. The file name is added in ticket 14.

**Blocked by:** 06 (Engine client), 07 (Project policy file)

**Status:** ready-for-agent

- [x] Setup sends the bash block to the engine's validate operation
- [x] An unknown key denies every shell call, naming the key and listing the valid keys
- [x] A bad level value denies every shell call, naming the key
- [ ] A valid policy leaves the plugin unblocked, and evaluations proceed
- [x] The blocked-state denial uses the auto-rejected label and the closing sentence
