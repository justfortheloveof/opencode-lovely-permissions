# 01: Rename the package to opencode-lovely-permissions

**What to build:** The package is identified as `opencode-lovely-permissions` everywhere at the package boundary: the manifest name and description ("Lovely permissions for OpenCode"), the lockfile, the README title and install paths, the GLOSSARY title, and the terminal-entry test that imports the `/tui` subpath by package name. Installing by the new name works, and the old name no longer appears in any tracked file.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The manifest `name` is `opencode-lovely-permissions` and the description reads "Lovely permissions for OpenCode"; the version remains `0.1.0`.
- [x] The lockfile package name matches the manifest.
- [x] The README title and both install-path examples use the new name.
- [x] The GLOSSARY title is "OpenCode Lovely Permissions"; the body terms are unchanged.
- [x] The terminal-entry test imports the `/tui` subpath as `opencode-lovely-permissions/tui`.
- [x] No tracked file contains the old name `opencode-lovely-bash-permissions`, except historical tickets under `.scratch/` that predate this rename.
- [x] `bun run test` passes.
