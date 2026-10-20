# 01: Scaffold the package

**What to build:** The package exists in the repository with its tooling and publish fields, and loads in OpenCode as a V2 plugin that does not yet do anything. Create the project with `vp create` in a temporary directory and move the files in, so `docs/`, `GLOSSARY.md`, and `AGENTS.md` are not overwritten. Pin pnpm to 12.14.0 and vite-plus to 1.3.0. Add `@opencode/plugin` pinned to 2.0.30. The package is named `opencode-lovely-bash-permissions`, is ESM, and its entry point is TypeScript source with no build step. Pre-commit runs `vp staged`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `vp check` and `vp test` pass on the scaffold
- [x] Package name, ESM type, and entry point match the spec, with no build step
- [x] `@opencode/plugin` is pinned to 2.0.30 and vite-plus to 1.3.0
- [x] Pre-commit runs `vp staged`
- [x] The plugin has a stable identifier and registers no behaviour yet
- [x] Existing `docs/`, `GLOSSARY.md`, and `AGENTS.md` are unchanged
