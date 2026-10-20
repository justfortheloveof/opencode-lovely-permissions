# 14: Layer the policy files

**What to build:** Read the global file from the location confirmed in ticket 04, the project file from ticket 07, and the local file `lovely-permissions.local.jsonc` in the same `.opencode` directory as the project file. Merge per mode name, with the local file winning over the project file and the project file winning over the global file. Objects merge recursively, and arrays concatenate in file order. A file that cannot be read or parsed, or that the engine rejects, denies every shell call with a message naming the file. Once this ticket lands, ticket 11 names the file the key came from.

**Blocked by:** 04 (Spike: config directory), 07 (Project policy file)

**Status:** ready-for-agent

- [ ] The local file overrides the project file, which overrides the global file, per mode name
- [ ] Objects merge recursively, and arrays concatenate in file order
- [ ] A file that cannot be read or parsed denies every shell call, with a message naming the file
- [ ] A file the engine rejects denies every shell call, naming the file and the key
- [ ] The global file is read from the location confirmed in ticket 04
- [ ] A missing file is not an error here; ticket 15 handles the case where no file exists
