# 15: Layering warnings and missing files

**What to build:** When a later file overrides a scalar from an earlier file, emit a warning that names the dotted key and both files. When none of the three policy files exists, every shell call asks, and the message names the three expected locations. Warnings must be visible to the user in OpenCode, not only in logs; check the V2 plugin docs for how plugins surface them.

**Blocked by:** 14 (Layer the policy files)

**Status:** resolved

- [x] A scalar overridden by a later file produces a warning naming the dotted key and both files
- [x] Array and object merges produce no override warning
- [x] With no policy file at all, every shell call gets the ask effect, and the message names the three expected locations
- [ ] Warnings reach the user in OpenCode, not only the logs
