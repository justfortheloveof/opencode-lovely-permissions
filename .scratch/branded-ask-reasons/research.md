# Branded ask and deny reasons: shown to the user, not the agent

> **Status: superseded.** The recommendation below (Option A, a server-only notice) was rejected. The decision is recorded in `docs/adr/0004-split-reasons-between-server-and-tui.md`: ask reasons show in a TUI banner, and deny reasons stay in the deny message.

## Question

Can the plugin's branded reasons (the `askMessage` and `denyMessage` bullets in `src/messages.ts`) appear in the OpenCode UI, ideally on the session timeline, without the model seeing them? Use the OpenCode v2 plugin API, pinned to tag `v2.0.32` (commit `843a6c514e606b436a7fe713422ace0a93ad3d61`). I read the upstream files from a shallow checkout at that tag, which has the same bytes as the raw URLs.

## Short answer and recommendation

Ask reasons never reach the model, but no built-in UI renders them: they exist only on the ephemeral `permission.asked` event. Deny reasons reach the model today, because they become the tool error the model reads, and the TUI shows them only when the failed row is expanded. The one plugin-reachable timeline surface that splits what the UI shows from what the model reads is a synthetic notice: the TUI and app show its `description`, while the model reads only `text`. So the recommended server-only route is to replace the shell tool's error with generic text in `ctx.tool.hook("execute.after")`, post the branded reasons as a `ctx.session.synthetic` notice `description` with a neutral sentinel `text`, and drop that sentinel from model requests by message ID. This is untested at runtime, and the notice appears after the tool row, not while the prompt is open. Showing ask reasons while the prompt is open is not possible on the timeline without an upstream change; a TUI-only CLI slot can show them above the composer instead.

## Current behaviour in this plugin

- `src/index.ts:38-62` registers `permission.hook("evaluate")` and acts only on the `shell` action (L39). An engine `ask` sets `event.effect = "ask"` and `event.message = askMessage(reasons)` (`applyVerdict`, L83-88). Deny paths go through `deny()` (L94-97), which sets `effect = "deny"` and `message`: startup failure (L40-43), unmatched command (L50-53), protocol mismatch (L58-61), and engine deny (L90). A missing policy asks with `noPolicyMessage` (L45-48).
- `src/messages.ts:4-5` defines the labels. `askMessage` (L14-16) is the label then `- reason` bullets. `denyMessage` (L23-28) is the label, the bullets, then "The tool has not been run." `noPolicyMessage` is at L68-78.
- Per-call state already exists: `recordCommand` on `execute.before` (`src/index.ts:36`, `src/command-capture.ts:10-18`) and `forgetCommand` on `execute.after` (`src/index.ts:37`, `src/command-capture.ts:20-22`), both keyed by tool-call ID.
- Pin: `package.json:24` has `"@opencode/plugin": "2.0.30"`. Lock: `pnpm-lock.yaml:179-180` and `:475-476`, with `effect@4.0.1` at `:1545`. Tag `v2.0.32` ships `@opencode/plugin` 2.0.32 (see Version check).

What OpenCode does with the two messages today:

- **Ask.** `message` is copied onto the `permission.asked` request only (`packages/core/src/permission.ts:191-202, 216-217`). Nothing in the model path reads pending requests, and no built-in prompt, timeline, app, or ACP view renders `message` (see the matrix).
- **Deny.** `message` becomes `BlockedError.reason` (`packages/core/src/permission.ts:237-243`). The built-in shell tool wraps that in a `ToolFailure` (`packages/core/src/tool/plugin/shell.ts:270-274`). The persisted error is sent to the model as JSON (`packages/core/src/session/runner/to-llm-message.ts:141-149`; `packages/core/src/aisdk.ts:665-670, 931-938`), and the TUI shows it inline on expand (`packages/tui/src/routes/session/message-parts.tsx:268-271`).

## Channel matrix

"Model sees" is traced to the converter that builds the model request. "Renders" is a built-in view checked by reading the component and grepping for the field. Paths are relative to the v2.0.32 tree (`packages/` omitted for brevity; full URLs in Sources).

| Channel | Model sees it? | Timeline / UI renders it? | Persisted? | Branding | Source |
|---|---|---|---|---|---|
| Evaluate `message`, **ask** → `permission.asked.message` | No. Pending requests have no model path. | No built-in view. A TUI CLI plugin can render it from `context.data.session.permission.list`, in slot `session.composer.top` (above the composer, not in the transcript). | No (ephemeral) | Free text; full JSX in CLI | core `permission.ts:191-202, 216-217`; schema `permission.ts:33, 45`; core `bus.ts:450-487`; tui `routes/session/permission.tsx:113-170` (no `message`); app `session-permission-dock.tsx:16, 64-68` |
| Evaluate `message`, **deny** → tool error | **Yes**: `{"error":{"type":"permission.rejected","message":...},"content":[]}` | Yes: TUI inline error on expand; session-ui error text | Yes (`ToolStateError.error`) | Text only | core `permission.ts:70-79, 237-243`; `shell.ts:270-274`; `to-session-error.ts:61, 63-67`; `to-llm-message.ts:141-149`; `aisdk.ts:665-670, 931-938`; tui `message-parts.tsx:268-271`; `message-updater.ts:361-378` |
| Evaluate `metadata` | n/a | Core ignores hook output other than `effect` and `message`; the field is readonly | n/a | n/a | `promise/permission.ts:13`; core `permission.ts:179-188` |
| `ctx.permission.assert({ metadata })` | No | Prompt presentation only (`permission.tsx:158-165`). The built-in shell passes no metadata (`shell.ts:138-147`). | No | Presentation keys only | core `permission.ts:173-203`; tui `permission.tsx:158-165` |
| `execute.after` completed → `result.metadata` | No: the converter uses `content` only (`to-llm-message.ts:125-138`) | No generic renderer. `GenericTool` shows input and output only (tui `index.tsx:2567-2600`). Some keys change status: `exit`/`timeout` on shell, `status` on running (session-ui `current-tool-state.ts:47-50`; `projection.ts:967`). | Yes (`ToolStateCompleted.metadata`) | None without renderer change | core `tool.ts:140-155`; `message-updater.ts:343-357`; schema `session-message.ts:139-145` |
| `execute.after` error → replace `event.error` with `new Tool.Error({ message, metadata })` | Message: **yes**. Metadata: **no**. | Message: as row 2. Metadata: no renderer. | Yes (`step.ts:129-130` passes `error.metadata` to `failTool`) | Text | core `plugin/plan.ts:44-53` (precedent); `runtime.ts:37-44`; `step.ts:129-130`; `publish-llm-event.ts:378-393`; schema `tool.ts:61-65` |
| `ctx.session.synthetic` → `text` | **Yes**: a user message | Yes, but the TUI shows `description`, not `text` (tui `index.tsx:1976-1978, 1999-2000`; label fixed as "◈ Notice") | Yes | Host sets icon and label | `to-llm-message.ts:287-288`; core `projector.ts:618-646`; `session.ts:273-312` |
| `ctx.session.synthetic` → `description`, `metadata` | **No** (not read by the converter) | **Yes**, both TUI and app. App label is `description ?? text` (session-ui `session-timeline-row.tsx:443-469`; app `message-timeline.tsx:18-19` uses this row renderer). | Yes | Free text in `description` | `to-llm-message.ts` (no read); `projection.ts:1050-1056` |
| `ctx.session.prompt` / `command` | Yes | Yes | Yes | n/a | docs `plugins/index.mdx:802-809` |
| `ctx.session.hook` `context` / `compaction` / `generate` / `title` | Edits only the outgoing request | None | No (one request only) | n/a | docs `plugins/index.mdx:1408-1409`; core `model-request.ts:99-119, 246-297`; `compaction.ts:695-697, 829-846` |
| Plugin RPC event (`registration.events.emit`) | No | Only a subscribed CLI plugin or client. No built-in view. | No (ephemeral) | Plugin-defined | core `rpc.ts:91-99, 192-199`; docs `cli.mdx:58-72` |
| CLI slots (`session.composer.top`, `sidebar.content`, `prompt.footer`, `session.panel`) | No | TUI only, outside the transcript. The slot map has no transcript slot. | No | Full JSX | plugin `src/tui/context.ts:191-202`; tui `routes/session/index.tsx:1466`; docs `cli.mdx:482-500` |
| CLI toast (`context.ui.toast.show`) | No | Transient toast | No | Title, variant | docs `cli.mdx:406-415` |
| CLI Markdown code-block renderer | Yes (it restyles message text the model reads) | TUI only | n/a | n/a | docs `cli.mdx:234-240` |
| `ctx.storage` (server) | No path found | No path found. TUI `context.storage` is TUI-local. | Yes | n/a | docs `plugins/index.mdx:912-949`; `cli.mdx:307-318` |
| `context.progress` (plugin-owned tools only) | No | Live only (`session.tool.progress` is ephemeral, `session-event.ts:520-526`). Folded into failed-tool metadata (`publish-llm-event.ts:117-120`). | Only on failure | n/a | Not usable for the built-in shell |
| Tool `content` / `output` | Yes | Yes | Yes | n/a | `runtime.ts:261-265`; `to-llm-message.ts:125-138` |
| `ctx.attention.notify` | No | OS notification only. The repo's own notification text is fixed (`notifications.ts:52-55`). | No | n/a | docs `cli.mdx:198-210` |

## Recommended approach

### A. Server plugin only (no upstream, no CLI plugin): deny and approved-ask lines on the timeline

1. Keep the current `evaluate` verdicts. In the evaluate hook, store the branded reasons under the call ID (`event.source.id`), the same way `command-capture.ts` stores the command.
2. In `ctx.tool.hook("execute.after", ...)`, for `event.tool === "shell"`:
   - **Status `error`, stored deny:** set `event.error = new Tool.Error({ message: GENERIC_DENY })`, where `Tool.Error` comes from `@opencode/plugin/promise/tool`. Without an `error` field, the persisted error becomes `{ type: "tool.execution", message: GENERIC_DENY }` (`to-session-error.ts:63-66`), so the reasons are no longer in the error. Then `await ctx.session.synthetic({ sessionID: event.sessionID, id, text: SENTINEL, description: denyMessage(reasons), resume: false })`. The TUI and app show the `description` as a notice after the tool row.
   - **Status `completed`, stored ask:** the same call with `askMessage(reasons)`. This is an after-the-fact "approved" line.
3. Register `ctx.session.hook` for `context`, `compaction`, `generate`, and `title`. Each drops `event.messages` entries whose `id` you recorded for a notice. The LLM `Message` keeps the synthetic message ID (`packages/ai/src/schema/messages.ts:237-240`; `to-llm-message.ts:287-288`). Use a non-empty sentinel, so a missed hook still shows the model nothing harmful.
4. Clear the per-call map on `execute.after`, and on `permission.replied` (via `ctx.event.subscribe`). A declined ask is a defect, not a `Tool.Error`, so `execute.after` never runs for it (`packages/core/src/permission.ts:253`; `tool.ts:119-121`), and without the second clear the entry leaks.
5. Verify: in `ctx.session.hook("http.request")`, assert the outgoing body has no branded label or reasons. In the TUI, `context.data.session.message.list(sessionID)` should show the notice `description`.

Why it works: the model reads `text` and the timeline reads `description`. Both paths are read in source. Limits: notices are promoted only at step boundaries (`session/runner/llm.ts:169-177`; `inbox.ts:44-48`), so they never appear while a permission prompt is open. They are durable and visible in history, and the plugin API has no message-delete method (`SessionContext.remove` deletes a session; docs `plugins/index.mdx:838-862`).

### B. Ask reasons while the prompt is open: CLI plugin or upstream

- **CLI plugin (TUI only, no upstream).** `context.data.session.permission.list(sessionID)` returns `PermissionRequest[]`, which includes `message` (plugin `src/tui/context.ts:89-93`; client `types.ts:728-737`). Render it in slot `session.composer.top` (plugin `src/tui/context.ts:198`; `routes/session/index.tsx:1466`). This needs a `./tui` export in `package.json` (docs `cli.mdx:597-616`). CLI plugins "extend the terminal" (docs `cli.mdx:5`), so the app and desktop would not show it, and the slot sits above the composer, not on the transcript.
- **Upstream.** Render `request.message` in `PermissionPrompt` (`routes/session/permission.tsx:113`), in the pending tool row (`routes/session/rows.ts:102-109`; `index.tsx:2624-2634`), and in `session-permission-dock.tsx`. The docs already say `message` "appears in an escalated permission request" (docs `plugins/index.mdx:1677`), so the built-in UI lags the docs.

### What is not possible

- **Show ask reasons on the timeline while the prompt is open.** No plugin channel reaches the transcript before the tool finishes, and the only prompt-time carrier is not rendered. Needs upstream.
- **Keep deny reasons in the tool error and hide them from the model.** The error is one field shared by the model (`to-llm-message.ts:141-149`) and the TUI (`index.tsx:2654`). Its text must change.
- **Attach metadata from the evaluate hook.** The hook's `metadata` is readonly, and core ignores hook output other than `effect` and `message` (`promise/permission.ts:13`; core `permission.ts:179-188`).
- **Create a hidden timeline row with a slot or Markdown renderer.** Slots have no transcript placement (`packages/plugin/src/tui/context.ts:191-202`), and Markdown renderers restyle message text the model reads (docs `cli.mdx:234-240`).
- **Show tool-row metadata on the timeline.** No built-in renderer displays arbitrary keys. Needs upstream.
- **Make a synthetic notice invisible to the model by itself.** The model always reads `text` (`to-llm-message.ts:287-288`). Hiding it needs the filter in step A3.

**Fallback (fully model-safe, no timeline).** Replace the tool error with generic text and store the reasons in `Tool.Error.metadata`. That field is persisted (`step.ts:129-130`; `message-updater.ts:361-378`) and never sent to the model (`to-llm-message.ts:141-149`). Only a CLI plugin or an upstream renderer can then show it.

## Open questions and unverified claims

- **Runtime behaviour is unverified.** Static reading shows admission takes only the per-aggregate lock inside `bus.publish` (`bus.ts:463-478`), and the tool fiber does not hold it while hooks run. I did not run a test for deadlock when `ctx.session.synthetic` is called from `execute.after` or the permission hook.
- **Extra model step.** I did not confirm that a steer notice admitted after the final tool result avoids starting another model step. The drain loop (`llm.ts:150-177`) was read, not run.
- **Empty `text`.** I recommend a non-empty sentinel. Provider handling of empty text was not checked.
- **Message-ID stability.** `projector.ts:618-646` projects `id: input.id`. Verified statically, not run.
- **`Tool.Error` metadata in the 2.0.30 package.** `metadata` is verified in source at v2.0.32 (`schema/tool.ts:61-65`). I did not install the 2.0.30 package to test it.
- **`BlockedError` is a `globalThis.Error`.** Verified in the npm `effect@4.0.1` tarball (`src/internal/core.ts:650`, `YieldableError extends globalThis.Error`), the version in the lock. Not checked in a built binary.
- **Docs vs source.** `plugins/index.mdx:1677` says `message` "appears in an escalated permission request". The event carries it, but no built-in UI renders it. Trust the source.
- **Local snapshot.** `docs/OpenCode_v2_plugins.md` differs from the v2.0.32 `plugins/index.mdx` in its header (lines 1-4) and in a `ctx.session.list` block (lines 795-801). The v2.0.32 docs have no such block, and the v2.0.32 plugin session API has no `list` (`promise/adapter.ts:591-613`). Do not use that example. The Permissions, hooks, and tool sections match.
- **`context` hook coverage.** I read the four request kinds in source only, including compaction's own flattening (`compaction.ts:829-846`). Not run.
- **Storage.** I found no path from `ctx.storage` to the TUI. TUI `context.storage` is TUI-local (docs `cli.mdx:307-318`).

## Version check

- The repo pins `@opencode/plugin` 2.0.30 (`package.json:24`; lock `pnpm-lock.yaml:179-180, 475-476`). Tag `v2.0.32` is `@opencode/plugin` 2.0.32 (`packages/plugin/package.json:4`). The versions differ.
- Between tags `v2.0.30` (`f16ef9ad8878279ea2be3cfab7baeed97aef61aa`) and `v2.0.32`, `git diff` over the files cited here (plugin source, the `build` docs folder, permission, tool, message conversion, step runner, inbox and projector, and the TUI, session-ui, and app permission and timeline code) shows only the plugin version bump plus two unrelated changes: a TUI copy-command and queued-prompt change (`packages/tui/src/routes/session/index.tsx`) and a session-ui context-tool-group cosmetic change (`packages/session-ui/src/tools/tool-renderer.tsx`). The `build` docs folder and `packages/plugin/src` are unchanged.
- At runtime the host OpenCode version decides behaviour, not the plugin pin. Test with the host you ship against.

## Sources

Upstream files are at tag `v2.0.32`. Raw form: `https://raw.githubusercontent.com/anomalyco/opencode/v2.0.32/<path>`. Line numbers are from that tree.

Docs (`services/www/src/docs/content/build/`):
- `plugins/index.mdx`: https://github.com/anomalyco/opencode/blob/v2.0.32/services/www/src/docs/content/build/plugins/index.mdx : L739-765 (Permissions; `metadata` L761; Tool.Error L763-765), L802-809 (session sends incl. synthetic), L838-862 (SessionContext, no delete), L912-949 (storage), L1408-1409 (context hook), L1653-1677 (evaluate hook; `message` L1677), L1731-1746 (execute.after).
- `plugins/cli.mdx`: https://github.com/anomalyco/opencode/blob/v2.0.32/services/www/src/docs/content/build/plugins/cli.mdx : L58-72 (events), L102-108 (permission read), L198-210 (attention), L234-240 (Markdown), L307-318 (storage), L406-415 (toast), L482-500 (slots), L597-616 (publish `./tui`).
- `plugins/rpc.mdx`: https://github.com/anomalyco/opencode/blob/v2.0.32/services/www/src/docs/content/build/plugins/rpc.mdx : L202-231 (subscribe; live only).
- `permissions.mdx` (sibling page): https://github.com/anomalyco/opencode/blob/v2.0.32/services/www/src/docs/content/permissions.mdx : L273 (clients reply to `ask`); no statement about `message`.

Plugin package (`packages/plugin/`):
- `package.json`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/package.json : L4 (version 2.0.32).
- `src/promise/permission.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/src/promise/permission.ts : L8-17.
- `src/promise/tool.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/src/promise/tool.ts : L1, L38-63.
- `src/promise/session.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/src/promise/session.ts : L25-30.
- `src/promise/adapter.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/src/promise/adapter.ts : L449-450, L516-517, L591-613, L605, L638-643.
- `src/tui/context.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/plugin/src/tui/context.ts : L62-66, L83-93, L191-202.

Core (`packages/core/src/`):
- `permission.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/permission.ts : L64-79, L173-203, L204-221, L223-263, L327-337.
- `plugin/hooks.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/plugin/hooks.ts : L88-95.
- `plugin/host.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/plugin/host.ts : L414-446.
- `plugin/plan.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/plugin/plan.ts : L44-53.
- `tool.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/tool.ts : L113-156.
- `tool/runtime.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/tool/runtime.ts : L29-61, L261-265.
- `tool/plugin/shell.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/tool/plugin/shell.ts : L138-147, L199-217, L270-274.
- `aisdk.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/aisdk.ts : L665-670, L931-938.
- `bus.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/bus.ts : L450-487.
- `rpc.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/rpc.ts : L91-99, L192-199.
- `session/to-session-error.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/to-session-error.ts : L58-67.
- `session/runner/to-llm-message.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/runner/to-llm-message.ts : L125-149, L287-288.
- `session/runner/step.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/runner/step.ts : L128-131, L206-213.
- `session/runner/publish-llm-event.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/runner/publish-llm-event.ts : L117-120, L378-393.
- `session/runner/llm.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/runner/llm.ts : L150-177.
- `session/message-updater.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/message-updater.ts : L343-357, L361-378.
- `session/model-request.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/model-request.ts : L99-119, L246-297.
- `session/compaction.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/compaction.ts : L695-697, L829-846.
- `session/session.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/session.ts : L273-312.
- `session/projector.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/projector.ts : L618-646.
- `session/inbox.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/core/src/session/inbox.ts : L44-48, L169-202, L458-527.

AI and schema:
- `packages/ai/src/schema/messages.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/ai/src/schema/messages.ts : L237-240.
- `packages/ai/src/schema/errors.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/ai/src/schema/errors.ts : L177 (`ToolFailure extends Tool.Error`).
- `packages/schema/src/permission.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/schema/src/permission.ts : L26-45.
- `packages/schema/src/tool.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/schema/src/tool.ts : L61-65.
- `packages/schema/src/session-message.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/schema/src/session-message.ts : L139-154.
- `packages/schema/src/session-inbox.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/schema/src/session-inbox.ts : L20-25.
- `packages/schema/src/session-event.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/schema/src/session-event.ts : L520-526.
- Effect is not in the tree. It is a dependency pinned by the lock at `effect@4.0.1` (`pnpm-lock.yaml:1545`), and I read `src/internal/core.ts:650` from the npm tarball produced by `npm pack effect@4.0.1` (a secondary source, not a v2.0.32 file).
- `packages/session-ui/package.json`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/session-ui/package.json : L11-14 (`./timeline/row` → `src/timeline/session-timeline-row.tsx`). Used by `packages/app/src/session/timeline/message-timeline.tsx:19`.

Client:
- `packages/client/src/promise/generated/types.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/client/src/promise/generated/types.ts : L728-737, L4610-4625.
- `packages/client/src/solid/data.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/client/src/solid/data.ts : L1205-1209.

TUI, app, and session-ui:
- `packages/tui/src/routes/session/permission.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/tui/src/routes/session/permission.tsx : L113-170 (`PermissionPrompt`; no `message`), L158-165 (`metadata`).
- `packages/tui/src/routes/session/rows.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/tui/src/routes/session/rows.ts : L102-109.
- `packages/tui/src/routes/session/index.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/tui/src/routes/session/index.tsx : L1466, L1976-2000, L2567-2600, L2624-2634, L2650-2668.
- `packages/tui/src/routes/session/message-parts.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/tui/src/routes/session/message-parts.tsx : L268-271.
- `packages/tui/src/feature-plugins/system/notifications.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/tui/src/feature-plugins/system/notifications.ts : L52-55.
- `packages/session-ui/src/timeline/session-timeline-row.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/session-ui/src/timeline/session-timeline-row.tsx : L443-469.
- `packages/session-ui/src/timeline/projection.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/session-ui/src/timeline/projection.ts : L1050-1056.
- `packages/session-ui/src/message/current-tool-state.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/session-ui/src/message/current-tool-state.ts : L33-37, L47-50.
- `packages/session-ui/src/tools/tool-renderer.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/session-ui/src/tools/tool-renderer.tsx : L737.
- `packages/app/src/session/timeline/message-timeline.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/app/src/session/timeline/message-timeline.tsx : L18-19.
- `packages/app/src/session/requests/session-permission-dock.tsx`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/app/src/session/requests/session-permission-dock.tsx : L16, L64-68.
- `packages/cli/src/acp/permission.ts`: https://github.com/anomalyco/opencode/blob/v2.0.32/packages/cli/src/acp/permission.ts : L49-50 (uses metadata, not `message`).

Local repo (this repo, read only):
- `src/index.ts` L22-64, L36-37, L38-62, L83-97.
- `src/messages.ts` L4-5, L14-16, L23-28, L68-78.
- `src/command-capture.ts` L10-22.
- `package.json` L24.
- `pnpm-lock.yaml` L179-180, L475-476, L1545.
- `docs/OpenCode_v2_plugins.md` L1-4 (header), L795-801 (`ctx.session.list`, not in v2.0.32).
