# opencode-lovely-permissions

OpenCode V2 plugin that evaluates agent shell commands against a shared bash policy.

## Install

### Plugin

Add the absolute path to a local checkout in `plugins` in your global or project `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/path/to/opencode-lovely-permissions"],
}
```

For a local checkout, run the commands in [Development](#development) before starting OpenCode.

### Bash engine

Install the engine from GitHub:

```bash
uv tool install git+https://github.com/justfortheloveof/lovely-bash-permissions
```

The engine's `lovely-pi-bash-permissions` command must be on `PATH`. To use a specific executable, set `LOVELY_PI_BASH_PERMISSIONS_BIN` to its path.

### Terminal CLI

Add the plugin to `cli.json` at `$XDG_CONFIG_HOME/opencode/cli.json` (or `~/.config/opencode/cli.json` when `XDG_CONFIG_HOME` is unset):

```json
{
  "$schema": "https://opencode.ai/cli.json",
  "plugins": ["/path/to/opencode-lovely-permissions"]
}
```

## Usage

### Policy files

Each policy file contains one or more modes. The `default` mode is required, and each mode contains a `bash` policy.

| Policy file                            | Location                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Global `lovely-permissions.jsonc`      | `$OPENCODE_CONFIG_DIR`, or `$XDG_CONFIG_HOME/opencode` (default `~/.config/opencode`) |
| Project `lovely-permissions.jsonc`     | `.opencode/` in the project                                                           |
| Local `lovely-permissions.local.jsonc` | `.opencode/` in the project; add this file to `.gitignore`                            |

Files are merged in global, project, then local order. A missing policy file makes shell commands ask.

Example project policy at `.opencode/lovely-permissions.jsonc`:

```jsonc
{
  "default": {
    "*": "ask",
    "bash": {
      "error": "ask",
      "allowed_cmds_regex": ["^git\\s+status$"],
      "blocked_cmds_regex": [],
    },
  },
}
```

See the [bash policy schema](https://github.com/justfortheloveof/lovely-bash-permissions/blob/main/README.lovely-pi-bash-permissions.md#the-bash-config-schema) for the available keys and levels.

### Select a mode

The plugin uses `default` unless you set the `mode` option:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-lovely-permissions",
      "options": { "mode": "strict" },
    },
  ],
}
```

Define `strict` alongside `default` in a policy file.

### Switch a Mode for this session location

When the plugin's TUI entry is loaded through the terminal CLI configuration above, run
`/lovely-permissions-cfg` without arguments. The picker lists the distinct Modes from the merged policy files for the
current session location and marks the active Mode. Choosing a Mode applies it immediately to future shell permission
checks for that location, including its other sessions and subagent sessions. Cancelling leaves the Mode unchanged.

This selection is temporary: it does not edit policy or OpenCode configuration, and a server restart or plugin reload
restores the configured `mode` option (or `default` when it is unset). The TUI command is loaded separately from
permission enforcement: add the plugin to `cli.json` as shown in [Terminal CLI](#terminal-cli), and load the server
plugin through `opencode.jsonc` as shown in [Plugin](#plugin).

### The ask banner

While a command is pending approval, the ask banner above the composer shows the brand label, the reasons the policy gave, and the call block: the command itself, syntax-highlighted, word-wrapped, and selectable. The block is at most half the terminal height; a longer command scrolls inside it, so the composer and prompt stay on screen. The banner appears for every ask it shows, including subagent asks, follows the ask being decided, and disappears with it. It is always on, with no setting to change that: the mode system governs policy levels, not display.

## Development

```bash
vp install
vp run build
vp check
vp run test
```
