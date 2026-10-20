# 04: Spike: config directory

**What to build:** Determine what the `OPENCODE_CONFIG_DIR` environment variable changes. Check whether it moves the global policy file location away from `~/.config/opencode`, and whether it is read when the plugin loads. Run the check outside the user's real configuration directory. Record the result in the spec's Further Notes and amend the global file decision if it differs.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Recorded: what the variable points to, and whether the global policy path follows it
- [x] Recorded: whether the variable is read at plugin load or at each call
- [x] If the variable does not move the policy path, the spec's global file decision is amended to the default location
- [x] The spike does not read or write the user's real `~/.config/opencode`
