# 05: Test harness and engine lookup

**What to build:** The test support every later ticket uses: a fake plugin context that records the hooks the plugin registers, and a stub engine that reads one request, records it, and writes one response. Also the engine lookup: use the path in the engine environment variable if it names an existing file, otherwise search `PATH` for the engine. If neither finds it, every shell call is denied with a message naming the install command and the environment variable.

**Blocked by:** 01 (Scaffold the package)

**Status:** ready-for-agent

- [x] The fake context captures the shell execute-before hook and the permission evaluate hook
- [x] The stub engine records the request it received, and tests can read that record
- [x] The environment variable wins over `PATH` when both exist
- [x] If the environment variable names a missing file, lookup falls back to `PATH`
- [x] With no engine found, a shell call is denied with the auto-rejected label, a message naming `uv tool install lovely-bash-permissions` and the environment variable, and the closing sentence
- [x] Tests set `PATH` to an empty directory unless they are testing `PATH` lookup, so the real engine is never run
