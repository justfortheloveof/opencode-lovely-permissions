# opencode-lovely-bash-permissions

An OpenCode plugin that checks every shell command the agent runs against your bash policy before it runs. The policy uses the same vocabulary as the Pi and Devin clients, and the decisions come from the same bash engine.

The plugin targets the OpenCode V2 plugin API, pinned to `@opencode/plugin` 2.0.30.

## What it does

For each shell tool call, the plugin sends the whole command line and your policy to the engine, `lovely-pi-bash-permissions`. The engine answers allow, ask, or deny, with one reason per matched rule. The plugin passes that verdict to OpenCode:

- **Allow** runs the command with no prompt and no message.
- **Ask** prompts you for approval before the command runs.
- **Deny** stops the command. The message gives the reasons, so the agent can change course.

Your policy decides every shell command. The plugin does not read OpenCode's shell rules. The one exception is OpenCode's explicit deny: OpenCode enforces it before the plugin is consulted, so it still applies.

Only the shell tool is checked. Other tools, MCP tools, and commands you type yourself are not. Shell calls made by subagents are checked by the same policy; in OpenCode 2.0.30 a `general` subagent's shell call reached the plugin, and a deny from the plugin stopped it.

## Install

### Add the plugin

Add the package name to `plugins` in your `opencode.jsonc`. Put it in your global OpenCode config to use it everywhere, or in a project's `opencode.jsonc` to use it for that project:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-lovely-bash-permissions"],
}
```

To use a local checkout instead of the published package, put the checkout's directory in `plugins`, for example `"/home/me/opencode-lovely-bash-permissions"`. OpenCode does not accept a path to a `.ts` file.

### Remote servers

If OpenCode runs on a remote server, that server must load this plugin too. A server without it runs shell commands under OpenCode's default rules, not your policy.

### Install the engine

```bash
uv tool install lovely-bash-permissions
```

This puts `lovely-pi-bash-permissions` on your `PATH`. The name keeps the Pi prefix because the engine is shared with the Pi extension.

The engine is not on PyPI yet, so the command above fails until it is published. Until then, install it from the repository:

```bash
uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions
```

### Point at a specific engine

The plugin looks for the engine in this order:

1. The file named by `LOVELY_PI_BASH_PERMISSIONS_BIN`, if the variable is set and names an existing file.
2. `lovely-pi-bash-permissions` on your `PATH`.

If the variable names no existing file, the plugin falls back to `PATH` without a warning. A policy file cannot set the engine path, so a project cannot point the plugin at its own engine.

If no engine is found, every shell command is denied, and the message names the install command and this variable.

## Policy files

The plugin reads three files. None is required, but if none exists every shell command asks.

| File                                   | Location                                                                                                                       | Commit it?                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Global `lovely-permissions.jsonc`      | `$OPENCODE_CONFIG_DIR` if set, otherwise `$XDG_CONFIG_HOME/opencode` (or `~/.config/opencode` when `XDG_CONFIG_HOME` is unset) | No, it is personal          |
| Project `lovely-permissions.jsonc`     | `.opencode/` in the project                                                                                                    | Yes                         |
| Local `lovely-permissions.local.jsonc` | `.opencode/` in the project                                                                                                    | No. Add it to `.gitignore`. |

`OPENCODE_CONFIG_DIR` replaces the default global directory. OpenCode reads it once per process, before plugins load, so set it before you start OpenCode. A change made inside a running process does not move the directory.

Each file is JSONC, so comments and trailing commas are allowed. Each file holds one object of modes, and `default` is required. A file that has no `default` mode is rejected, even if it only adds a named mode.

### Writing a policy

This is a minimal working policy, in the project file or in the global file:

```jsonc
// .opencode/lovely-permissions.jsonc
{
  "default": {
    "*": "ask",
    "bash": {
      "error": "ask",
      "allowed_cmds_regex": ["^git\\s+status$"],
      "blocked_cmds_regex": ["/etc/"],
    },
  },
}
```

A mode is a named object. `bash` holds the policy for shell commands. `*` on the mode is the default level for the bash block. Other modes sit next to `default` in the same file, for example `"strict": { ... }`.

The bash block accepts these keys, and no others. An unknown key is rejected at startup, and the message lists the valid keys.

A mode accepts only `bash` and `*`, and its `*` must be `allow`, `ask`, or `deny`. Every mode in a file is checked, so a misspelt mode key or level is rejected at startup, and the message names the key.

| Key                    | Accepts                                                                                                 | Decides                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `*`                    | a level                                                                                                 | the default for every key this bash block does not set                                    |
| `error`                | a level                                                                                                 | a command the engine cannot analyse, or cannot answer within 5 seconds                    |
| `allowed_cmds_regex`   | a list of regular expressions                                                                           | commands that match one are allowed outright                                              |
| `blocked_cmds_regex`   | a list of regular expressions                                                                           | commands that match one are denied, whatever the other rules say                          |
| `output_redirection`   | a level, or an object with `*`, `stdout_to_dev_null`, `stderr_to_dev_null`, `stderr_to_stdout`, `other` | output redirection, per kind. `other` covers every other write, such as a write to a file |
| `input_redirection`    | a level                                                                                                 | input redirection                                                                         |
| `background_execution` | a level                                                                                                 | background execution                                                                      |
| `command_substitution` | a level                                                                                                 | command substitution                                                                      |
| `process_substitution` | a level                                                                                                 | process substitution                                                                      |
| `subshell`             | a level                                                                                                 | subshells                                                                                 |
| `variable_assignment`  | a level                                                                                                 | variable assignments                                                                      |

A level is `allow`, `ask`, or `deny`, and nothing else. `block` is rejected.

A construct's level is resolved in this order: its own level, then the bash block's `*`, then the mode's `*`, then `ask`. The mode's `*` only supplies levels to the bash block.

The engine judges the whole command line, so pipes, `&`, subshells, and redirections are judged in context. In the example above, `git status && rm -rf build` asks, because `rm -rf build` matches no allowed pattern.

## Layering

When more than one file exists, the files are merged per mode name, with later files winning. The order is global, then project, then local.

- Objects merge key by key.
- Arrays concatenate. A project can add patterns to your global `allowed_cmds_regex` without replacing them.
- Any other value, such as a level, replaces the earlier one. The plugin writes a warning to the log that names the key and both files. The warning is not shown in OpenCode; see [Known limitations](#known-limitations).
- An unreadable or invalid file denies every shell command, and the message names the file.

## Modes

The `mode` option chooses which mode the plugin uses. Set it in the plugin entry of `opencode.jsonc`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-lovely-bash-permissions",
      "options": { "mode": "strict" },
    },
  ],
}
```

The default is `default`. If the chosen mode does not exist in any policy file, every shell command is denied, and the message names the mode and lists the modes that exist.

To change mode, change the option and restart OpenCode. Switching modes inside a session is not supported in this release.

## Verdicts and what you see

- **Allow** runs the command. You see nothing: no prompt and no message.
- **Ask** pauses the command for your approval. The plugin's message starts with `[♡ perms: 💛 REQUIRES-USER-APPROVAL]` and lists the reasons, one bullet each. In OpenCode 2.0.30 the prompt shows only the command; see [Known limitations](#known-limitations).
- **Deny** stops the command. The message starts with `[♡ perms: ❤️ auto-rejected]`, lists the reasons, one bullet each, and ends with `The tool has not been run.` In OpenCode 2.0.30 the reasons show only after you expand the denied row.

Your policy overrides OpenCode's own allow and ask for shell commands, in both directions. OpenCode's explicit deny always stands.

## When something goes wrong

The plugin checks the engine and the policy when OpenCode starts. A problem found there denies every shell command, and the message names the fix. Fix the problem and restart OpenCode.

| Problem                                                                                                                   | Result                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Engine not found                                                                                                          | Every shell command is denied. The message names the install command and `LOVELY_PI_BASH_PERMISSIONS_BIN`. |
| Engine cannot start or does not answer                                                                                    | Every shell command is denied. The message names the failure and the fix.                                  |
| Engine answers with a different protocol version, at startup or on a command                                              | Every shell command is denied from then on. The message names the mismatch and the fix.                    |
| Policy file cannot be read, is not valid JSONC, has no `default` mode, or has a mode key or `*` level that is not allowed | Every shell command is denied. The message names the file.                                                 |
| Engine rejects the bash block, for example an unknown key or a bad level                                                  | Every shell command is denied. The message names the engine's error.                                       |
| Chosen mode does not exist                                                                                                | Every shell command is denied. The message names the mode and the modes that exist.                        |
| No policy file in any of the three locations                                                                              | Every shell command asks.                                                                                  |
| The engine errors, or does not answer within 5 seconds, on one command                                                    | That command gets the `error` level. The reason is the engine's message.                                   |

A failure on one command affects only that command.

## Known limitations

- **Ask prompts show only the command.** In OpenCode 2.0.30 the approval prompt shows the command, but not the reasons or the brand label. The plugin still sends them.
- **Layering warnings are logged, not shown.** OpenCode 2.0.30 gives this plugin no visible channel for a warning, so warnings only reach the log.
- **The no-policy warning is not shown.** With no policy file, every command asks. The ask names the three locations, but because of the first limitation you see only the command.
- **Commands made only of `cd` are never checked.** For example, `cd src` is not checked by this plugin, because OpenCode does not ask about it.
- **Approvals are not saved.** This plugin does not handle the "always" choice on an approval prompt.

## Out of scope

- Handling the "always" choice on an approval prompt.
- V1 OpenCode plugin support. This release targets the V2 API only.
- Switching modes inside a session, for example with a slash command. Change the `mode` option and restart.
- Importing OpenCode's own shell rules, allow or deny, in any form.
- Non-shell tools (`read`, `write`, `edit`, `grep`, `find`, `ls`), MCP tools, and the `doom_loop` check.
- Your typed shell commands. Only agent tool calls are checked.
- Commands made only of `cd`, which OpenCode does not ask about.
- A contract test against the real engine. The plugin's tests use a stub engine.
- Publishing to npm. The package is ready to publish, but the release itself is a separate step.
- A build step. The entry point ships as TypeScript source.

## License

MIT, as declared in `package.json`.
