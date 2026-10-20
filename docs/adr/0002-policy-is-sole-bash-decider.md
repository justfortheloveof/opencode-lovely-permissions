# The policy is the only bash decider; OpenCode's shell rules are not imported

The plugin ignores OpenCode's own `shell` allow and deny rules. Importing allows is unsafe: OpenCode resolves rules last-match-wins and its primary-agent default allows `shell *`, so an import could loosen the policy. Importing denies adds nothing, because OpenCode enforces its explicit denies before the plugin runs.

Consequences: a command that OpenCode allows still asks unless the policy allows it, and an explicit OpenCode deny still wins.
