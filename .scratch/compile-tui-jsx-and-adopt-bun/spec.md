Status: ready-for-agent

# Compile the TUI from Solid JSX and adopt Bun

## Problem Statement

The maintainer wants the terminal Ask banner expressed with normal Solid JSX rather than explicit `jsx()` calls. OpenCode 2.1.1 loads plugin entries but does not apply OpenTUI's Solid JSX transform to plugin source, so placing raw JSX in the shipped entry is not a safe solution. The current package also uses pnpm and Vite+ Vitest, while the supported OpenTUI transform and the selected unified test runner use Bun.

The change must preserve the Ask banner's user-visible behavior and the server plugin's existing verdict behavior while changing the source-to-package boundary and development workflow.

## Solution

Author the TUI in Solid JSX, compile it to a JavaScript package entry using OpenTUI's supported transform, and leave OpenCode to load the compiled entry with host runtime imports externalized. Adopt Bun for package installation and all tests, while retaining Vite+ for checks and task orchestration. Preserve the existing Ask banner behavior and server behavior.

## User Stories

1. As a maintainer, I want to author the TUI with Solid JSX, so that the banner's rendering structure is readable and idiomatic.
2. As an OpenCode user, I want the Ask banner to show the same pending reasons after the source is converted to JSX, so that the rendering refactor does not change what I see.
3. As an OpenCode user, I want the banner to preserve the Ask brand label and the permission request's reason text verbatim, so that I can recognize why the command is waiting for approval.
4. As an OpenCode user, I want the banner to disappear when its pending ask is answered, so that stale reasons are not left above the composer.
5. As an OpenCode user, I want the next pending ask's reasons to appear after the current ask is answered, so that the banner continues to match the prompt.
6. As an OpenCode user, I want the viewed session's ask to take precedence over asks from its subagents, so that the banner follows the prompt in the session I am viewing.
7. As an OpenCode user, I want subagent asks to appear in the parent session's banner in family order, so that I can decide on them without opening the subagent session.
8. As an OpenCode user, I want no Ask banner inside a subagent's own session, so that the banner appears only where the prompt is available.
9. As an OpenCode user, I want no banner for unbranded permission requests, so that another tool's message is not presented as this plugin's reason.
10. As an OpenCode user, I want no banner when there is no pending ask or the chosen ask has no reasons, so that the composer stays uncluttered.
11. As an OpenCode user, I want the missing-policy Ask to show its file-location reasons, so that I can see why commands are waiting when no policy file exists.
12. As an OpenCode user, I want pending permission requests for the viewed session family to be synchronized when the banner mounts, so that an ask is recovered after reconnecting.
13. As an OpenCode user, I want a permission-sync failure not to create an unhandled error or hide an already available reason, so that a display problem does not disrupt the prompt.
14. As an OpenCode user, I want a failure while reading or rendering banner data to leave the permission prompt and server verdict unchanged, so that the TUI cannot change whether a command runs.
15. As an OpenCode user, I want the composer slot to be removed when the terminal plugin is disposed, so that the banner does not outlive its plugin.
16. As an OpenCode user, I want the server plugin to keep producing the same allow, ask, and deny verdicts and messages, so that the TUI and toolchain changes do not change command policy.
17. As a package user, I want the published TUI entry to be JavaScript with its host runtime imports external, so that OpenCode can resolve those imports from its own runtime.
18. As a package user, I want the server entry to remain usable without installing the optional TUI peers, so that server-only use remains supported.
19. As a package user, I want package packing to generate and include the compiled TUI entry, so that a published package does not depend on a consumer running the JSX transform.
20. As a maintainer loading a local checkout, I want the local terminal entry to point at the generated artifact, so that directory loading uses the same compiled module shape as package loading.
21. As a maintainer, I want a documented build command before loading a fresh local checkout, so that the generated entry is present when OpenCode resolves the directory.
22. As a maintainer, I want Bun declared as the package manager selected by Vite+, so that Vite+ install commands delegate to Bun consistently.
23. As a maintainer, I want one Bun test runner for the whole suite, so that TUI tests using the OpenTUI transform do not require a second runner.
24. As a maintainer, I want to run the package test script through `vp run test`, so that Vite+ remains the task orchestrator while Bun runs the tests.
25. As a maintainer, I want `vp check` to remain available, so that the existing formatting, lint, and type-check workflow is retained.
26. As a maintainer, I want Bun's default release-age behavior, so that dependency installation follows the selected package manager's defaults rather than retaining pnpm-specific policy configuration.
27. As a maintainer, I want the README to document the final package manager, build, test, and local-loading steps, so that contributors can follow the implemented workflow.

## Implementation Decisions

- The TUI is authored as TSX and transformed with OpenTUI's supported Bun Solid transform. The shipped terminal entry is compiled JavaScript; raw JSX is not left for OpenCode to transform.
- Externalize the OpenCode plugin SDK, OpenTUI Solid renderer, and Solid runtime imports emitted by the transform. OpenCode 2.1.1's TUI runtime provides mappings for those host modules.
- Build a dedicated terminal artifact. The server plugin entry remains source-based and is not bundled as part of this change.
- The package's public TUI export and the root local-directory shim both select the generated terminal artifact. Packing generates the artifact; generated output is not committed. A local checkout must be built before OpenCode loads its terminal entry.
- Declare Bun as the repository's package manager, with Vite+ selecting it from project metadata. Replace the pnpm lock/configuration with Bun's lockfile and Bun-compatible single-package configuration; do not create a workspace solely to preserve the old pnpm catalog.
- Keep Vite+ for checks and task execution. The package test script uses Bun's test runner with per-file isolation and is invoked through `vp run test`; `vp test` is not the canonical test command.
- Port all existing suites to Bun's test APIs and move test setup and host-runtime fakes to Bun-compatible setup. Retain the server test coverage and all existing TUI behavior cases.
- Use Bun's default dependency release-age behavior. Do not carry over pnpm's release-age exclusions or configure a release-age delay.
- Keep the current optional OpenTUI and Solid peer-dependency contract and OpenCode 2.1.1 target. Do not change the server/plugin behavior or policy semantics.
- Update the README after the actual scripts and package exports are implemented: document Bun/Vite+ commands, the local build requirement, and package loading. Preserve the existing statements that remote loading is unverified and not required.
- ADR-0005 records the compiled Solid JSX package boundary. ADR-0006 records the Bun package-manager and test-runner decision.

## Testing Decisions

Good behavior tests exercise the plugin through its setup and composer slot, render the result with OpenTUI's headless renderer, and assert visible banner text or its absence. They must not depend on the internal JSX node shape, generated helper names, or Solid implementation details.

Use one high-level TUI behavior seam: the plugin setup with a fake terminal context supplying sessions, session families, and pending permission requests. Preserve the current cases for branded reasons, pending-ask changes, family ordering, parent/subagent visibility, permission synchronization, read/sync failures, and slot cleanup. Render the returned slot through OpenTUI's headless renderer and assert the user-visible output.

Test the generated package boundary separately with static build and manifest checks: the compiled entry exists, package exports and shipped files select it, the local directory shim selects it, and expected host imports remain external. These checks do not prove that OpenCode successfully loads the compiled artifact at runtime.

Run all test suites under Bun after replacing the current Vite+ test API. Verify the existing module-mock behavior and Node subprocess cases under the selected Bun version. Keep `vp check` as the lint, formatting, and type-check validation. Package/build validation must verify that packing runs the build and includes the generated artifact.

Prior art includes the existing pure Ask banner selection-rule tests, the fake terminal-context harness that drives plugin setup and composer slots, and the package-entry tests that verify host resolution and manifest exports. Preserve their external behavior checks while replacing JSX-tree assertions and Vite-only aliases with the agreed Bun/OpenTUI testing seam.

## Out of Scope

- Changing which pending ask the banner selects, its text, placement, or visibility rules.
- Changing server-side verdicts, permission request messages, deny messages, or policy evaluation.
- Making OpenCode transform raw TSX from an installed plugin package.
- Bundling a second OpenTUI or Solid runtime into the published plugin.
- Changing the optional peer ranges or the OpenCode 2.1.1 compatibility target.
- Verifying remote automatic TUI loading or changing the existing remote-loading waiver.
- Requiring an in-app smoke test of the generated artifact for this task. Runtime loading of that specific artifact must nevertheless not be claimed as verified based on static checks alone.

## Further Notes

- The compiled helper imports are statically mapped by the inspected OpenCode 2.1.1 TUI runtime, but this generated artifact has not been exercised end-to-end in OpenCode. Report that limitation accurately.
- Bun is a build and development prerequisite. Published consumers use the generated JavaScript entry and do not need Bun to load the plugin.
- The manager migration intentionally drops pnpm's effective release-age delay in favor of Bun defaults, as agreed.
- The original implementation and Ask banner specs remain historical records; their superseded tooling/package-entry guidance is marked separately and the feature behavior they describe remains in force.
