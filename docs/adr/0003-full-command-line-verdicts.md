# Verdicts use the full command line, not OpenCode's per-command resources

OpenCode's permission request lists one resource per simple command, with pipelines and `&&` split apart. The engine's structural rules (pipes, `&`, subshells, redirections) would be lost if it judged those pieces alone. The plugin therefore captures the full command in `tool.hook("execute.before")` and matches it to the permission request by `source.id`. This depends on a spike confirming that the hook fires first and carries the same call ID.
