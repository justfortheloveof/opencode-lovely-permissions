# Compile Solid JSX before loading the TUI entry

OpenCode loads plugin entries but does not apply OpenTUI's Solid JSX transform to plugin source; its TUI runtime does provide mappings for the host imports emitted by that transform. Author the TUI in TSX, compile it with OpenTUI's Bun transform into `dist/tui.js`, externalize host runtime imports, and point both the package TUI export and the local root shim at that generated entry.

## Considered options

- Keep explicit `jsx()` calls in the shipped `.ts` entry. Rejected because the maintainer wants JSX syntax in the source.
- Ship raw `.tsx` and rely on OpenCode to transform it. Rejected because the plugin loader does not run the Solid transform, and OpenTUI's transform excludes installed package source.
- Compile TSX to JavaScript and ship the generated entry. Selected because it preserves JSX authoring while leaving OpenCode a loadable JavaScript entry.

## Consequences

- `dist` is generated rather than committed. Packaging builds it; loading the repository checkout locally requires running the build first.
- The OpenCode 2.1.1 runtime mappings for the compiled entry's external imports are supported by static inspection, but this exact generated entry has not been exercised end-to-end in the app. Runtime loading must not be described as verified until it is.
