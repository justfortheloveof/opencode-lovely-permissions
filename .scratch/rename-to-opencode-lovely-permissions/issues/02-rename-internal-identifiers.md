# 02: Rename the internal identifiers to lovely-permissions

**What to build:** The plugin's in-process identities drop "bash": the server plugin's id becomes `lovely-permissions`, the TUI entry's id becomes `lovely-permissions`, and the mode-switch RPC becomes `rpc.lovely-permissions` with vendor `lovely-permissions`. The TUI command stays `/lovely-permissions-cfg` and the picker titles stay "Lovely permissions Mode" (already bash-free), so no user-visible text changes. Tests asserting the old identifiers are updated, and the Engine contract is untouched.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The server plugin id is `lovely-permissions`.
- [ ] The TUI entry id is `lovely-permissions`.
- [ ] The mode-switch RPC id is `rpc.lovely-permissions` and its vendor is `lovely-permissions`.
- [ ] Tests asserting the plugin id, RPC id, and vendor use the new values.
- [ ] The Engine binary name, `LOVELY_PI_BASH_PERMISSIONS_BIN`, the engine install URL, and the policy file names are unchanged.
- [ ] `bun run test` passes.
