# Compile Solid JSX before loading the TUI entry

OpenCode loads plugin entries but does not apply OpenTUI's Solid JSX transform to plugin source; its TUI runtime does provide mappings for the host imports emitted by that transform. Author the TUI in TSX, compile it with OpenTUI's Bun transform into `dist/tui.js`, externalize host runtime imports, and point both the package TUI export and the local root shim at that generated entry.

## Considered options

- Keep explicit `jsx()` calls in the shipped `.ts` entry. Rejected because the maintainer wants JSX syntax in the source.
- Ship raw `.tsx` and rely on OpenCode to transform it. Rejected because the plugin loader does not run the Solid transform, and OpenTUI's transform excludes installed package source.
- Compile TSX to JavaScript and ship the generated entry. Selected because it preserves JSX authoring while leaving OpenCode a loadable JavaScript entry.

## Consequences

- `dist` is generated rather than committed. Packaging builds it; loading the repository checkout locally requires running the build first.
- The OpenCode 2.1.1 runtime mappings for the compiled entry's external imports were checked by static inspection. A manual run in a live OpenCode session has since shown the compiled entry rendering a highlighted call block, but no automated test loads the built entry end-to-end.
- `@opentui/core` is left out of the build's externals on purpose. The TUI loads its `SyntaxStyle` class through a dynamic import whose specifier is built at runtime, because a static import would make the bundler inline the package's platform-native assets. The bundler leaves that import for the host to resolve.
