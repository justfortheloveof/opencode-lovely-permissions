# 17: README and publish readiness

**What to build:** Replace the README stub with documentation for installing the plugin by name, installing the engine with `uv tool install lovely-bash-permissions`, the engine environment variable, the three policy files and their locations, the layering rules, the mode option, the verdicts and what the user sees, the failure behaviour, and the `cd`-only gap. Include a minimal working policy example. State that modes change by option plus restart, and list what is out of scope. Check the package against the Publish section of the V2 plugin docs.

**Blocked by:** 12 (Engine unusable at startup), 13 (Per-command failures), 15 (Layering warnings and missing files), 16 (Mode option)

**Status:** ready-for-agent

- [x] The README covers install, the engine and its environment variable, the three policy files, layering, modes, verdicts, failures, and the `cd`-only gap
- [x] The README includes a minimal working policy example with the mode wrapper and the bash block
- [x] The README states the subagent result from spike 03
- [x] The package meets the Publish section checklist in the docs: name, version, entry point, files, and dependencies
- [x] `vp check` and `vp test` pass
