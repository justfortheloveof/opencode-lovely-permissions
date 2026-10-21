# Use Bun for package management and tests

Use Bun as the package manager selected by Vite+ project metadata, and use Bun's test runner for the repository suite. Keep Vite+ for checks and task orchestration, invoking the package test script with `vp run test`; this aligns package installation and tests with the Bun runtime required by OpenTUI's supported TSX transform.

## Considered options

- Keep pnpm for installs and Vite+ Vitest for tests, adding Bun only for the TUI build. Rejected to avoid maintaining separate package-manager and test-runner workflows after choosing Bun for the build.
- Keep the existing Vite+ Vitest suite and add only Bun tests for the TUI. Rejected because the same suite would then be split across runners and test configurations.

## Consequences

- Existing tests move to `bun:test`; the canonical test script runs `bun test --parallel`, and `vp test` is not the repository test command. Use `vp run test` to run the package script.
- Vite+ remains responsible for checks and can delegate installs to Bun based on the project manager declaration.
- Bun's default install policy has no minimum-release-age gate. The migration accepts that default rather than preserving pnpm's effective release-age delay and package exceptions.
