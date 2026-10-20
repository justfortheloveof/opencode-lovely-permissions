# 16: Mode option

**What to build:** The `mode` plugin option selects the mode to use, and defaults to `default`. The selected mode's bash block and wildcard are passed to the engine. If the selected mode does not exist in the merged policy, every shell call is denied, with a message that names the mode and lists the modes that exist. A file with no `default` mode denies every shell call and names the file.

**Blocked by:** 14 (Layer the policy files)

**Status:** ready-for-agent

- [x] With no option set, the `default` mode is used
- [x] With a named mode that exists, that mode's bash block is used
- [x] A selected mode that does not exist denies every shell call, naming the mode and listing the modes that exist
- [x] A file with no `default` mode denies every shell call, naming the file
- [x] The mode is read once at setup, so changing it needs a restart
