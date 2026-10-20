# Evaluate bash with the Python engine, not the npm port

The plugin runs `lovely-pi-bash-permissions`, the Python engine, once per command instead of the TypeScript npm port (`@justfortheloveof/lovely-bash-permissions`). The engine is the reference for the policy vocabulary and parses with shfmt's bash AST. The port has a different vocabulary (it accepts `blocked_paths_regex` on bash) and parses with shell-quote, so the same policy could give different verdicts. The cost is that users must install Python and the engine.
