Status: ready-for-agent

# Rename the package to opencode-lovely-permissions

## Problem Statement

The package is named `opencode-lovely-bash-permissions`, but the "bash" in the name will soon be a lie: the plugin will grow to support permission types beyond bash at a future date. The user-facing surfaces are already branded without "bash" — the TUI command is `/lovely-permissions-cfg`, the picker is titled "Lovely permissions Mode", and the policy files are `lovely-permissions.jsonc` — so the package name and its internal identifiers are the outliers.

## Solution

Rename the package and its internal identifiers to drop "bash":

- The npm package becomes `opencode-lovely-permissions`, with the description "Lovely permissions for OpenCode".
- The server plugin's id and the TUI entry's id become `lovely-permissions`; the mode-switch RPC becomes `rpc.lovely-permissions` with vendor `lovely-permissions`.
- The README title, install paths, and the GLOSSARY title follow the new name.

The rename is name-only: the plugin continues to evaluate only bash (shell) commands, and the docs keep their accurate bash descriptions of what it evaluates today. Only the names and titles change.

## User Stories

1. As a user installing the plugin, I want the package to be named `opencode-lovely-permissions`, so that the package name matches the "Lovely permissions" brand I already see in the TUI and the policy files.
2. As the maintainer preparing to add non-bash permission types, I want the package name to no longer promise bash-only, so that future scope growth does not require another rename.
3. As a user of the TUI, I want the command and picker to keep working exactly as before, so that the rename changes no behavior I can see.

## Implementation Decisions

- The `opencode-` prefix is deliberate: it follows OpenCode plugin naming standards and is a deliberate outlier of the lovely family's `lovely-<host>-permissions` pattern.
- The version remains `0.1.0`: the old name was never published to npm, so the new name starts fresh with no history to carry.
- The Engine's own identifiers keep "bash": the `lovely-pi-bash-permissions` binary, the `LOVELY_PI_BASH_PERMISSIONS_BIN` environment variable, and the engine's GitHub URL are the Python engine's identity and a shared contract with the sibling engine repository.
- The policy file names (`lovely-permissions.jsonc`, `lovely-permissions.local.jsonc`) are already bash-free and are untouched.
- The GLOSSARY body terms (**Policy**, **Engine**, **Mode**, …) keep their bash-scoped definitions: they describe today's truth, and the glossary records current behavior, not intended scope.
- The checkout directory is not renamed as part of this feature; the maintainer handles that separately.
- Historical tickets under `.scratch/` (for example `initial-implementation`) keep their old name references: they record what was true when that work was done.

## Testing Decisions

- Existing tests that assert the package name, plugin id, RPC id, or vendor are updated to the new values; a rename adds no new test surface.
- The full suite (`bun run test`, which builds the TUI first) must pass.

## Out of Scope

- Renaming the checkout directory.
- Adding non-bash permission support (a future feature; the name is forward-looking).
- Renaming the Engine binary, its environment variable, the engine's repository URL, or the policy file names.
- Any change to verdicts, Modes, policy merging, or permission behavior.
- A version bump.

## Further Notes

- No ADR is recorded: the rename is easy to reverse (the package was never published and the repository is local-only), so it fails the "hard to reverse" bar. This spec carries the naming rationale instead.
- The name deliberately leads the behavior: it is broader than today's bash-only scope, in anticipation of future permission types.
