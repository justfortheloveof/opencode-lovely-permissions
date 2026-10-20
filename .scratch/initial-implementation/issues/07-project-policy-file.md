# 07: Project policy file

**What to build:** Read `lovely-permissions.jsonc` from the `.opencode` directory under the plugin context's location directory. Parse it as JSONC, with comments and trailing commas allowed. Require the mode wrapper with a `default` mode, and extract that mode's bash block and wildcard. This ticket reads only the project file. Layering is ticket 14.

**Blocked by:** 01 (Scaffold the package)

**Status:** ready-for-agent

- [x] JSONC with comments and trailing commas parses
- [x] A file with no `default` mode is reported as invalid
- [x] The bash block and the top-level wildcard are returned unchanged
- [x] A missing file is reported as absent, distinct from invalid
- [x] An unparseable file is reported as invalid, not absent
