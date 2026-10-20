Status: ready-for-agent

# Initial implementation: OpenCode bash permissions plugin

## Problem Statement

OpenCode's agent runs shell commands under its own permission rules. Those rules are coarse: the primary agent allows `shell *` by default, and there is no way to say "allow `git status`, ask about everything else, deny writes to `/etc`" in the same vocabulary the user already uses in Pi and Devin.

The user already keeps a bash policy for the Pi extension and the Devin hook, written as a JSONC file with allowlists, blocklists, and a level per shell construct. They want that same policy, with the same verdicts and the same behaviour, to decide every shell command the OpenCode agent tries to run. They also want the prompts and denials to be recognisable as coming from this policy, so they can tell at a glance why a command was held.

## Solution

An OpenCode plugin that checks every shell tool call against the user's policy before it runs.

For each call, the plugin sends the whole command line to the bash engine (the Python program from `lovely-bash-permissions`) together with the policy for the selected mode. The engine returns a verdict: allow, ask, or deny, with one reason per matched rule. The plugin passes that verdict to OpenCode:

- **Allow** runs the command with no prompt and no message.
- **Ask** prompts the user, showing the reasons as bullets under the brand label `[♡ perms: 💛 REQUIRES-USER-APPROVAL]`.
- **Deny** stops the command and shows the reasons under `[♡ perms: ❤️ auto-rejected]`, ending with "The tool has not been run."

The policy is the only thing that decides bash commands. The plugin does not read OpenCode's own shell rules. OpenCode's explicit deny still applies, because OpenCode enforces it before the plugin is consulted.

If the engine is missing or the policy is invalid, every shell command is denied with a message naming the fix. If there is no policy file, every shell command asks, with a warning.

## User Stories

### Installing and locating the engine

1. As an OpenCode user, I want to add the plugin by name in my OpenCode configuration, so that every shell command the agent runs is checked against my bash policy.
2. As an OpenCode user, I want to install the bash engine with one command, `uv tool install lovely-bash-permissions`, so that setup is a single step.
3. As an OpenCode user, I want the plugin to find the engine on my `PATH` by default, so that I configure nothing when the standard install works.
4. As an OpenCode user, I want to point the plugin at a specific engine binary with an environment variable, so that I can use a development build or a pinned install.
5. As an OpenCode user, I want the plugin to tell me exactly what is missing and how to fix it when the engine cannot be found, so that I am never left guessing why commands are blocked.
6. As an OpenCode user, I want the plugin to tell me when the engine is found but cannot start or does not speak the expected protocol version, so that a broken install is distinguished from a policy decision.

### Writing the policy file

7. As a user, I want to write my policy in one JSONC file with comments and trailing commas, so that I can document why each rule exists.
8. As a user, I want the policy written in the same shape as my Pi configuration, so that one file works across Pi and OpenCode.
9. As a user, I want named modes in one file, so that a strict policy and a permissive policy can sit side by side.
10. As a user, I want the `default` mode to be required, so that a file without it is rejected instead of silently doing nothing.
11. As a user, I want the bash block to accept only the keys the engine understands, so that a typo fails loudly instead of quietly changing a verdict.
12. As a user, I want an unknown key rejected by name with the list of valid keys, so that I can correct the typo straight away.
13. As a user, I want every policy construct to accept `allow`, `ask`, or `deny` and nothing else, so that each construct has one clear outcome.
14. As a user, I want a `*` level on the bash block and on the mode, so that I can set one default for everything and override individual constructs.
15. As a user, I want a construct with no level of its own to inherit the bash block's `*`, then the mode's `*`, then `ask`, so that a missing key never leaves a gap.
16. As a user, I want `allowed_cmds_regex` patterns to allow a command outright, so that I can list the commands I trust.
17. As a user, I want `blocked_cmds_regex` patterns to deny a command whatever the other rules say, so that I can forbid things regardless of the allowlist.
18. As a user, I want a command that matches no allow pattern to fall to the default level, so that unknown commands are handled by the default I chose.
19. As a user, I want output redirection to be set per kind (discarding stdout to `/dev/null`, discarding stderr, stderr to stdout, and every other write), so that harmless discards can be allowed while file writes still ask.
20. As a user, I want `other` to be a separate key from `*` in output redirection, so that a write to a file is judged by its own key.
21. As a user, I want input redirection, background execution, command substitution, process substitution, subshells, and variable assignments each to have their own level, so that I can tune each construct separately.
22. As a user, I want an `error` level applied to any command the engine cannot analyse, so that an unparseable command cannot fall through to allow.
23. As a user, I want the policy checked when the session starts, so that a bad file is reported before my first command rather than during it.

### Layering policy files

24. As a user, I want a global policy file in my OpenCode configuration directory, so that my personal defaults apply to every project.
25. As a user, I want a project policy file in the project's `.opencode` directory, so that the team's rules are committed with the repository.
26. As a user, I want a local policy file that is never committed, so that I can override the team's rules for myself.
27. As a user, I want the three files merged per mode name, with the local file winning over the project file and the project file winning over the global file, so that a project can change one construct without rewriting the rest.
28. As a user, I want arrays such as allowlists concatenated across files, so that a project can add patterns to my global list instead of replacing it.
29. As a user, I want a warning when a later file overrides a value from an earlier one, naming the key and both files, so that I can see what changed and where.
30. As a user, I want an unreadable or invalid file to deny every shell command with a message naming the file, so that a broken file never silently drops a rule.

### Choosing a mode

31. As a user, I want to choose the mode with a plugin option, so that I can pin a mode for a setup.
32. As a user, I want the mode to default to `default` when I set no option, so that the common case needs no configuration.
33. As a user, I want a clear error naming the modes that exist when the chosen mode is missing, so that I can correct the option.
34. As a user, I want to switch modes by changing the option and restarting OpenCode, so that the mechanism stays simple in this release.

### Verdicts the user sees

35. As a user, I want an allowed command to run with no prompt, so that trusted commands do not interrupt me.
36. As a user, I want an ask verdict to pause the agent and prompt me, so that I decide on anything the policy does not clearly allow.
37. As a user, I want a denied command never to run, and the agent to see the reason, so that it can change course.
38. As a user, I want the reasons in a prompt or denial shown as one bullet each, in the order the engine produced them, so that I can see exactly why the command was held.
39. As a user, I want every prompt from this plugin to start with the brand label `[♡ perms: 💛 REQUIRES-USER-APPROVAL]`, so that I recognise its prompts.
40. As a user, I want every denial from this plugin to start with the brand label `[♡ perms: ❤️ auto-rejected]` and to end with "The tool has not been run.", so that a denial is clearly marked and clearly not executed.
41. As a user, I want the reasons to name the part of the command that caused them, so that I know what to change in the command or the policy.
42. As a user, I want an allowed command to add no message to the conversation, so that the transcript stays quiet for trusted commands.
43. As a user, I want the whole command line judged as written, not piece by piece, so that pipes, `&`, subshells, and redirections are judged in context.
44. As a user, I want my policy to decide a command that OpenCode would allow, so that the policy is the single place bash is decided.
45. As a user, I want my policy to allow a command that OpenCode would ask about, so that I can relax OpenCode's prompts for commands I trust.
46. As a user, I want OpenCode's own explicit deny to keep applying, so that deny rules I set there still hold.
47. As a user, I want shell calls made by subagents to follow the same policy, so that delegating a task cannot bypass it. (Confirm in the spike.)
48. As a user, I want to know that a command made only of `cd` is never checked by this plugin, because OpenCode does not ask about it, so that I am not surprised.

### When things go wrong

49. As a user, I want every shell command denied with a message naming the fix when the engine is missing or cannot start, so that a broken install is never mistaken for permission.
50. As a user, I want every shell command denied with a message naming the error and the file when my policy is invalid, so that I fix the file instead of running unchecked.
51. As a user, I want every shell command to ask, with a warning, when no policy file exists, so that a fresh install is safe.
52. As a user, I want a command the engine cannot answer within 5 seconds to follow the `error` level, so that a slow analysis is handled like any other unanalysable command.
53. As a user, I want a failure on one command to affect only that command, so that the rest of the session carries on.
54. As a user, I want every failure message to say what failed and how to fix it, so that I do not have to read logs.

### Publishing and maintaining the plugin

55. As a maintainer, I want the package published as `opencode-lovely-bash-permissions` with its entry point exported as TypeScript source, so that OpenCode loads it the way its documentation describes.
56. As a maintainer, I want the plugin pinned to the OpenCode plugin version that matches the OpenCode release we run, so that it does not break against a newer API.
57. As a maintainer, I want the plugin to target the OpenCode V2 plugin API only, so that V1 support can be added later without blocking the first release.
58. As a maintainer, I want the project scaffolded with `vp create` and its dependencies added with `vp add`, so that tooling matches the Pi and Devin repositories.
59. As a maintainer, I want pre-commit hooks to run formatting, lint, and tests on staged files through `vp staged`, so that broken code does not reach a commit.

## Implementation Decisions

- **Plugin entry.** The package's default export is a V2 plugin definition with a stable identifier. It reads one plugin option, `mode`, which defaults to `default`. It registers three hooks on setup: one on the shell tool's `execute.before`, one on the shell tool's `execute.after`, and one on the permission `evaluate`.
- **Command capture.** On `execute.before` for the shell tool, the plugin records the full command line keyed by the call's identifier. The `execute.after` hook drops the entry when the call finishes. This relies on `execute.before` firing before the permission request, with the same identifier, which the spike must confirm.
- **Verdict evaluation.** On `permission.evaluate` for the shell action, the plugin looks up the captured command through the permission request's source identifier, sends it to the engine, and maps the verdict onto the permission effect. If no captured command is found, the plugin denies the call with a message saying it could not be matched, rather than allowing it. When no policy file exists, every shell call asks, including one with no captured command, because the no-policy rule applies first.
- **Verdict mapping.** Allow maps to allow, ask to ask, and deny to deny. The word "deny" is used throughout; "block" is not used. The engine's reasons become the permission message, one bullet each.
- **Authority.** The policy's verdict overrides OpenCode's own computed effect for shell calls, in both directions, except that an explicit OpenCode deny is final because OpenCode enforces it before the plugin hook runs.
- **No import of OpenCode rules.** The plugin does not read OpenCode's shell allow or deny rules, in any form. See ADR 0002.
- **Engine client.** One engine process is spawned per command. The request is the protocol-version-1 `evaluate` operation carrying the whole command line, the resolved bash block, and the mode's top-level wildcard. The response carries `action`, `reason`, and `reasons`, and its protocol field must equal 1. A mismatch is a startup failure, not a per-command one: a mismatch seen during a command also puts the plugin in the failed state, and that call and every later shell call are denied with the protocol message. A call that does not answer within 5 seconds is killed, and its verdict comes from the `error` level. See ADR 0001.
- **Engine resolution.** The engine path comes from the environment variable `LOVELY_PI_BASH_PERMISSIONS_BIN` if it is set and points to an existing file. Otherwise the plugin searches `PATH` for `lovely-pi-bash-permissions`. The path is not configurable from a policy file, so a project cannot point the plugin at its own engine.
- **Startup validation.** On setup, the plugin asks the engine to validate the resolved bash block, and it checks that the engine binary exists and answers. Any failure puts the plugin in a failed state, in which every shell call is denied with a message naming the failure and the fix.
- **Policy files.** There are three locations: a global file in the OpenCode configuration directory (honouring the `OPENCODE_CONFIG_DIR` environment variable if set, as confirmed by spike 04; see Further Notes), a project file in the project's `.opencode` directory, and a local file alongside it. The shared file name is `lovely-permissions.jsonc`. The project directory is the location directory from the plugin context.
- **Merge rules.** Files are merged per mode name, later files winning. Objects merge recursively. Arrays concatenate. A scalar overridden by a later file produces a warning naming the dotted key and both files. An unreadable or invalid file denies every shell call, with a message naming the file.
- **Mode selection.** The selected mode's bash block and its top-level wildcard are passed to the engine. A missing selected mode, or a file with no `default` mode, is an invalid policy: every shell call is denied, with a message naming the mode or file.
- **Fallback chain.** A construct's level resolves as: its own level, then the bash block's `*`, then the mode's `*`, then `ask`. A mode-level `*` supplies levels only to bash, and it does not activate anything.
- **Policy vocabulary.** The bash block accepts exactly the keys the engine accepts: the wildcard, `error`, the two command allowlists, `output_redirection` (either a single level or an object over the four redirection kinds), and the level keys for input redirection, background execution, command substitution, process substitution, subshells, and variable assignments. The plugin validates the bash block with the engine, so the bash vocabulary is defined once, in the engine. The engine never sees a mode, so the plugin checks the mode itself: a mode accepts only `bash` and `*`, and its `*` must be `allow`, `ask`, or `deny`. It checks every mode in each file it reads, not only the selected one, and a key or level that fails makes that file invalid, naming the file and the key.
- **Messages.** Three shapes, all built in one place:
  - Allow: no message.
  - Ask: the brand label `💛 REQUIRES-USER-APPROVAL`, then the reasons, one line per reason, each starting with `- `.
  - Deny: the brand label `❤️ auto-rejected`, then the reasons, one line per reason, each starting with `- `, then "The tool has not been run."
  Messages are never built anywhere else.
- **Missing or invalid policy.** No policy file: every shell call asks, with a warning. Invalid policy, or a missing engine: every shell call is denied, with a message naming the failure and the fix.
- **Per-command failures.** A parse failure or an engine error on one command gives that command the `error` level, with the engine's message as its reason.
- **Scope of hooks.** Only the shell tool is gated. Other tools, the agent's own non-shell tools, and the user's typed shell commands are not checked.
- **Packaging.** The package is named `opencode-lovely-bash-permissions`. It depends on `@opencode/plugin` pinned to 2.0.30, which matches the installed OpenCode release. Its entry point is exported as TypeScript source with no build step. The package is ESM.
- **Tooling.** The project uses pnpm 12.14.0 as its package manager, vite-plus 1.3.0 for check, format, test, and pre-commit, and is scaffolded with `vp create` and extended with `vp add`. Pre-commit runs `vp staged`.
- **Decisions recorded elsewhere.** ADR 0001 records using the Python engine instead of the npm port. ADR 0002 records that the policy is the only bash decider. ADR 0003 records that verdicts use the full command line. The glossary defines the vocabulary used in this spec.

## Testing Decisions

**What makes a good test here.** Tests exercise the plugin only through the public entry: calling its setup with a fake OpenCode context, capturing the three hooks it registers, and driving them. Assertions are about what OpenCode would receive: the effect, the message, and whether the engine was called. Tests do not assert on internal helpers, on the order of internal calls, or on how the configuration was merged in memory. A test that passes after a refactor of internals is a good test; a test that breaks on one is not.

**The one seam.** The plugin's setup, with a fake context that records hook registrations. There is no other production seam for injecting behaviour.

**The engine in tests.** Tests point the engine environment variable at a stub script that reads one request from its input and writes one response. The stub records what it was sent, so tests can check that the whole command line and the mode's wildcard were passed through. This is the same override the Pi client's engine tests use, so no new production injection point is added.

**Configuration in tests.** Each test writes its own temporary global and project configuration and points the global directory at it with the configuration-directory variable. Tests never read the real user configuration.

**Modules and behaviour covered.**
- Each verdict through the permission hook: allow with no message; ask with the ask label and bullets; deny with the deny label, bullets, and the closing sentence.
- Command capture: a command captured on the shell call is the one evaluated for the permission request, and a missing capture produces a denial.
- Bash-block keys and the fallback chain are the engine's responsibility and are covered by the engine's own tests. The mode's own keys are checked by the plugin, and the layering tests cover them. Plugin tests check that the bash block and mode wildcard are forwarded unchanged and that the engine's answer is applied.
- Layering: local over project over global, arrays concatenated, scalars overridden with a warning naming both files, an invalid file denies every shell call.
- Mode selection: default mode, named mode, missing named mode, file without `default`.
- Each failure state: engine missing, engine not starting, protocol mismatch, invalid policy, missing policy, timeout, and per-command engine error.
- Engine resolution: environment variable first, then `PATH`, then the fix message.
- Exact message text for each label, pinned by literal strings in the test rather than built from the code under test.

**Prior art in the sibling repositories.**
- The Pi extension's session tests inject a fake evaluator and assert exact messages, which is the pattern for the permission hook tests.
- The Pi extension's engine tests use the binary override, which is the pattern for the stub engine.
- The Pi extension's message tests pin the brand strings literally, which is the pattern for the message tests.
- The engine's own CLI tests cover the protocol. We do not re-test the engine.

**Tooling.** Tests run under `vp test`. The coverage report is text only.

## Out of Scope

- Handling the "always" choice on a permission request. For now, approvals are not persisted by this plugin.
- V1 plugin support, including a `server()` export.
- A slash command or other in-session mode switching. Modes are selected by the plugin option and a restart.
- Importing OpenCode's own shell rules, allow or deny, in any form.
- Non-shell tools (`read`, `write`, `edit`, `grep`, `find`, `ls`), MCP tools, and the `doom_loop` check.
- The user's typed shell commands, which are not agent tool calls.
- Commands made only of `cd`, which OpenCode does not ask about.
- A contract test that runs the real engine. It is deferred; the stub-based tests cover the plugin.
- Publishing to the npm registry. The package is made publishable, but the publish itself is not part of this spec.
- A build step. The entry point ships as TypeScript source.

## Further Notes

**Spike before implementation.** Four facts are unverified and the design depends on them. The spike must confirm them, and the findings should be written back into this spec before the implementation begins:
- `execute.before` fires before the permission request for the same call, and carries the full command.
- OpenCode renders multi-line permission messages as bullets. If it does not, the message falls back to one line per reason.
- Subagent shell calls reach the permission hook.
- The `OPENCODE_CONFIG_DIR` environment variable is the directory that holds the global configuration, and its exact behaviour.
- **Spike 04, what the variable points to (OpenCode 2.0.30).** With `OPENCODE_CONFIG_DIR` set, that directory replaces the default global directory (`$XDG_CONFIG_HOME/opencode`, or `~/.config/opencode` when `XDG_CONFIG_HOME` is unset). `opencode debug paths` reports it as `config`, and `config.get` lists it as the global source. Its `opencode.jsonc` loads, and the default directory's file does not. So a `lovely-permissions.jsonc` placed there follows the variable. OpenCode does not parse that file; the plugin reads it. The plugin context exposes no config path, so the plugin resolves the directory from the variable itself.
- **Spike 04, load or per call.** The variable is read once per OpenCode process, before plugins load, and never again. A plugin setup that changed the variable in the same process did not move OpenCode's global directory, and `opencode reload` did not either. The plugin should resolve its path in `setup`. Plugin tests can point the variable at a different directory per test only because the plugin reads it in its own `setup`; OpenCode's own reading does not follow a change in the same process.
- **Spike 04, not verified.** The exact moment of the first read, which was before the first plugin setup in the spike. The embedded code suggests it is at process start, but that was not isolated.
- **Spike 04, decision.** The variable does move the global policy path, so the "Policy files" decision stands and was not amended to the default location.
- Confirmed on OpenCode 2.0.30 (ticket 02): `execute.before` fires before the permission request. For an allowed shell call, `tool.execute.before` was logged before `permission.evaluate`. For a call OpenCode marks `ask`, `tool.execute.before` came first, then `permission.evaluate` (effect `ask`), then the `permission.asked` event. Logs: `/tmp/opencode/implement-spec/spikes/02-command-capture/out/`.
- Confirmed: the call ID matches. The `id` on `tool.execute.before` equals `source.id` on `permission.evaluate` and on the `permission.asked` event, in both runs.
- Confirmed: the captured string is the full command line. `input.command` was `echo hi | cat > <path> && true`, including the pipe, redirection, and `&&`. The permission request's `resources` are split per simple command (`echo hi`, `cat`, `true`), so the captured string is what the engine needs. One run's captured command had a trailing space, so the engine should not depend on exact trailing whitespace. No answer was no, so the Command capture decision is unchanged.

**Publishing.** The package is published with pnpm. Its `devEngines.packageManager` field names pnpm 12.14.0, and that stays as it is.

**Prior decisions.** The decisions in this spec came out of a grilling session. Recorded decisions are in ADR 0001, ADR 0002, and ADR 0003. The vocabulary is in the glossary.

**Branch.** This work is on the `initial-implementation` branch, branched from `dev`.

- **Spike 03, rendering (OpenCode 2.0.30).** Denials render correctly. The TUI shows the deny message as separate lines: `[♡ perms: ❤️ auto-rejected]`, then `- Spike reason one: …` and `- Spike reason two: …` on their own lines, then `The tool has not been run.` Ask prompts do not. The TUI ask prompt shows only `△ Permission required` and `$ echo …`, with no permission message text, although the `permission.asked` event carries the full multi-line message. Because of this, the Messages decision now specifies one line per reason. Ask reasons are not visible in the prompt, which conflicts with the Solution's "showing the reasons as bullets" and with story 38 for asks. Decision (user): keep the spec as written. The ask message is still set on the effect and reaches OpenCode, but OpenCode 2.0.30's TUI does not display it, so ask prompts show only the command. This is a known limitation to document in the README.
- **Spike 03, subagents.** Shell calls made by a subagent reach the permission hook. A `general` subagent's shell call fired `permission.evaluate` with its own session (`agent: general`, `parentID` set to the primary session). A deny from the hook blocked the call. Story 47 holds, so it is not amended.
- **Spike 15, layering warnings (OpenCode 2.0.30).** Text sent with `ctx.session.synthetic` reaches the model but does not appear in the TUI transcript. With the default `resume`, it makes the model reply as if the user had spoken. An allow verdict cannot carry a message through the permission hook, so warnings have no visible channel in this release. Decision (user): keep the spec as written. Layering warnings must still be visible to the user, and the gap is recorded here and to be documented in the README. Until a channel is found, warnings are logged. Findings: `/tmp/opencode/implement-spec/notes/synthetic-visibility.md`.
- **Live end-to-end check (OpenCode 2.0.30, real engine).** Passed: an allowed command runs with no prompt; a denied command never runs and shows the deny label, reasons, and closing sentence; an ask pauses, and the TUI shows only the command; policy allow overrides an OpenCode ask; policy ask and deny override an OpenCode allow; OpenCode's explicit deny stays in place with the hook not called; a policy deny blocks a subagent's shell call; a missing engine denies with the fix message. Not verified live: the "Always allow" choice, the engine-error path, and a layered global policy beyond the override check. Evidence: `/tmp/opencode/implement-spec/notes/live-e2e.md`.
- **Plugin loading (OpenCode 2.0.30).** A package name loads. A local directory loads only when it has an `index` file at its root, so the package has a root `index.ts` that re-exports `src/index.ts`. The `exports` field is not used for directory paths. A path to a `.ts` file is refused with a warning. The plugin option `mode` works, as does `{ "package", "options" }`. Layering override warnings reach stderr only with `--print-logs`, not `opencode.log`. Evidence: `/tmp/opencode/implement-spec/notes/plugin-loading.md`.
