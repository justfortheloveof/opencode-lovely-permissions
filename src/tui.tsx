import { Plugin } from "@opencode/plugin/tui";
import { onResize } from "@opentui/solid";
import type { ColorInput, NativeResourceOwner, SyntaxStyle, ThemeTokenStyle } from "@opentui/core";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { pickAskBannerMessage } from "./ask-banner.ts";
import { pickCallBlock } from "./call-block.ts";
import { MODE_RPC } from "./mode-rpc.ts";

/**
 * The fraction of the terminal height the call block may occupy (ADR-0007). Content beyond the
 * bound scrolls inside the block, so the block can never push the composer off screen; the
 * design does not depend on the exact value.
 */
const CALL_BLOCK_HEIGHT_FRACTION = 0.5;

interface AskBannerProps {
  readonly context: Plugin.Context;
  readonly sessionID: string;
}

function pendingPermissions(context: Plugin.Context, sessionID: string) {
  return context.data.session.permission.list(sessionID) ?? [];
}

/** The token-to-color syntax palette of the host-resolved theme. */
type ThemeSyntax = Readonly<Record<string, ColorInput>>;

/** The host's `SyntaxStyle` constructor, loaded from `@opentui/core` at runtime. */
type SyntaxStyleCtor = typeof SyntaxStyle;

/**
 * Load the `SyntaxStyle` class from `@opentui/core` once, at runtime. The specifier is built
 * indirectly so the bundler leaves it as a runtime import of the host's own `@opentui/core`
 * (the same copy the `<code>` element uses) instead of inlining the package and its
 * platform-specific native assets into the TUI build. Resolves to `null` when unavailable.
 */
let syntaxStyleCtorPromise: Promise<SyntaxStyleCtor | null> | undefined;
function loadSyntaxStyleClass(): Promise<SyntaxStyleCtor | null> {
  const spec = "@opentui/core";
  syntaxStyleCtorPromise ??= import(spec).then(
    (mod) => (mod as { SyntaxStyle?: SyntaxStyleCtor }).SyntaxStyle ?? null,
    () => null,
  );
  return syntaxStyleCtorPromise;
}

/**
 * The token-to-scope rules for the call block's syntax style, mirroring the host's own mapping
 * of its syntax tokens (the theme package's `generateSyntax`) onto tree-sitter scopes.
 */
function syntaxStyleRules(syntax: ThemeSyntax): ThemeTokenStyle[] {
  const rules: ThemeTokenStyle[] = [];
  const rule = (
    scopes: string[],
    token: string,
    style: Omit<ThemeTokenStyle["style"], "foreground"> = {},
  ) => {
    const foreground = syntax[token];
    if (foreground !== undefined) rules.push({ scope: scopes, style: { foreground, ...style } });
  };

  rule(["comment", "comment.documentation"], "comment", { italic: true });
  rule(["string", "symbol", "character.special", "character"], "string");
  rule(["number", "boolean", "constant", "float"], "number");
  rule(
    ["keyword.return", "keyword.conditional", "keyword.repeat", "keyword.coroutine"],
    "keyword",
    {
      italic: true,
    },
  );
  rule(["keyword.type"], "type", { bold: true, italic: true });
  rule(["keyword.function", "function.method"], "function");
  rule(["keyword"], "keyword", { italic: true });
  rule(
    ["keyword.import", "string.escape", "string.regexp", "tag.attribute", "keyword.export"],
    "keyword",
  );
  rule(
    ["operator", "keyword.operator", "punctuation.delimiter", "keyword.conditional.ternary"],
    "operator",
  );
  rule(
    [
      "variable",
      "variable.parameter",
      "function.method.call",
      "function.call",
      "property",
      "parameter",
      "field",
    ],
    "variable",
  );
  rule(["variable.member", "function", "constructor"], "function");
  rule(["type", "module", "class", "namespace"], "type");
  rule(["type.definition"], "type", { bold: true });
  rule(["punctuation", "punctuation.bracket"], "punctuation");

  return rules;
}

/**
 * Build the call block's syntax style from the host-resolved theme, owned by the renderer's
 * native scene. Yields nothing — so the block degrades to unstyled text — when the style class
 * or the scene is absent (as in the test harness) or the theme cannot supply token colors.
 * Never throws.
 */
function buildSyntaxStyle(
  ctor: SyntaxStyleCtor | null,
  theme: unknown,
  owner: NativeResourceOwner | undefined,
): SyntaxStyle | undefined {
  try {
    if (ctor === null || owner === undefined) return undefined;
    const syntax = (theme as { readonly syntax?: ThemeSyntax } | null)?.syntax;
    if (syntax === null || typeof syntax !== "object") return undefined;
    const rules = syntaxStyleRules(syntax);
    if (rules.length === 0) return undefined;
    return ctor.fromTheme(rules, owner);
  } catch {
    return undefined;
  }
}

interface CallBlockProps {
  readonly context: Plugin.Context;
  readonly content: string;
  readonly filetype: string;
}

/**
 * The call block: the ask's tool call as a word-wrapped, selectable code element bounded at
 * half the terminal height, so it scrolls inside itself and never pushes the composer off
 * screen. Without a buildable syntax style it degrades to the same block as plain text.
 */
function CallBlock(props: CallBlockProps) {
  try {
    // The syntax style is a native resource owned by the renderer's native scene; the fake
    // terminal context in the tests exposes no scene, so the style is unbuildable there.
    const owner = (props.context.renderer as { readonly nativeScene?: NativeResourceOwner })
      .nativeScene;

    // The style class loads from the host's @opentui/core at runtime; until it is available
    // (or if it never is) the block shows the command as unstyled text, so the command is
    // never missing while highlighting loads.
    const [styleCtor, setStyleCtor] = createSignal<SyntaxStyleCtor | null>(null);
    onMount(() => {
      // A thunk: the class is a function, and the signal setter would call it as an updater.
      void loadSyntaxStyleClass().then((ctor) => setStyleCtor(() => ctor));
    });

    // The ½-viewport height bound, re-read reactively: `terminalHeight` is a signal in the
    // test harness and a plain getter in the host, so the resize revision covers the host.
    const [resizeRevision, setResizeRevision] = createSignal(0);
    const maxHeight = createMemo(() => {
      void resizeRevision();
      return Math.max(
        1,
        Math.floor(props.context.renderer.terminalHeight * CALL_BLOCK_HEIGHT_FRACTION),
      );
    });

    // The style depends on the theme, so it is rebuilt (destroying its predecessor) when the
    // host theme changes, and destroyed with the block.
    let activeStyle: SyntaxStyle | undefined;
    const syntaxStyle = createMemo(() => {
      const next = buildSyntaxStyle(styleCtor(), props.context.theme, owner);
      activeStyle?.destroy();
      activeStyle = next;
      return next;
    });
    onCleanup(() => {
      activeStyle?.destroy();
      activeStyle = undefined;
    });
    // Registered last: it is the only step that can throw (no renderer context), and every
    // other hook above is already set up, so a throw degrades to the unbounded text fallback.
    onResize(() => {
      setResizeRevision((revision) => revision + 1);
    });

    const style = syntaxStyle();
    if (style === undefined) {
      return <text content={props.content} wrapMode="word" style={{ maxHeight: maxHeight() }} />;
    }
    return (
      <code
        content={props.content}
        filetype={props.filetype}
        wrapMode="word"
        syntaxStyle={style}
        style={{ maxHeight: maxHeight() }}
      />
    );
  } catch {
    return <text content={props.content} wrapMode="word" />;
  }
}

/** The banner message as the brand label line and the remaining reason lines. */
function splitBannerMessage(message: string) {
  const newline = message.indexOf("\n");
  return {
    label: newline === -1 ? message : message.slice(0, newline),
    reasons: newline === -1 ? "" : message.slice(newline + 1),
  };
}

function AskBannerSlot(props: AskBannerProps) {
  try {
    if (props.context.data.session.get(props.sessionID)?.parentID) return null;

    const familySessionIDs = props.context.data.session.family(props.sessionID);
    onMount(() => {
      const sessionIDs = new Set([props.sessionID, ...familySessionIDs]);
      void Promise.all(
        [...sessionIDs].flatMap((familySessionID) => [
          props.context.data.session.permission.sync(familySessionID),
          props.context.data.session.message.sync(familySessionID),
        ]),
      ).catch(() => {});
    });

    return () => {
      try {
        // Each ask keeps the session it came from, so the call block can read that session's
        // messages; the banner itself follows the same asks as today.
        const asks = [
          ...pendingPermissions(props.context, props.sessionID).map((request) => ({
            request,
            sessionID: props.sessionID,
          })),
          ...familySessionIDs
            .filter((familySessionID) => familySessionID !== props.sessionID)
            .flatMap((familySessionID) =>
              pendingPermissions(props.context, familySessionID).map((request) => ({
                request,
                sessionID: familySessionID,
              })),
            ),
        ];
        const message = pickAskBannerMessage(
          asks.map(({ request }) => ({ message: request.message ?? "" })),
        );
        if (message === undefined) return null;

        // The rule picks the first ask, so the chosen one is first; its session supplies the
        // messages the call block recovers the tool call from.
        const chosen = asks[0]!;
        const messages = props.context.data.session.message.list(chosen.sessionID) ?? [];
        const callBlock = pickCallBlock(chosen.request, messages);
        if (callBlock === undefined) {
          // The derivation yielded nothing: render exactly today's label-and-reasons banner.
          return <text>{message}</text>;
        }

        const { label, reasons } = splitBannerMessage(message);
        return (
          <box flexDirection="column">
            <text>{label}</text>
            <CallBlock
              context={props.context}
              content={callBlock.content}
              filetype={callBlock.filetype}
            />
            <text>{reasons}</text>
          </box>
        );
      } catch {
        return null;
      }
    };
  } catch {
    return null;
  }
}

export default Plugin.define({
  id: "lovely-permissions",
  setup(context) {
    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "lovely-permissions-cfg",
          title: "Switch lovely permissions Mode",
          description: "Temporarily switch the bash permissions Mode for this location",
          slash: { name: "lovely-permissions-cfg" },
          run: async () => {
            const route = context.ui.router.current();
            const location =
              route.type === "session"
                ? (context.data.session.get(route.sessionID)?.location ?? context.location)
                : context.location;
            const modes = context.client.rpc(MODE_RPC);
            const loaded = await modes.listModes({}, { location });
            if (loaded.status === "invalid") {
              await context.ui.dialog.alert({
                title: "Lovely permissions Mode",
                message: "Configuration invalid",
              });
              return;
            }
            if (loaded.status === "absent" || loaded.modes.length === 0) {
              context.ui.dialog.show(() => (
                <box
                  title="Lovely permissions Mode"
                  border
                  borderStyle="rounded"
                  padding={1}
                  flexDirection="column"
                  gap={1}
                >
                  <text>No modes configured.</text>
                  <text>esc to close</text>
                </box>
              ));
              return;
            }

            const selected = await context.ui.dialog.select({
              title: "Lovely permissions Mode",
              options: loaded.modes.map((mode) => ({ title: mode, value: mode })),
              current: loaded.activeMode,
            });
            if (selected === undefined) return;

            const result = await modes.setMode({ mode: selected }, { location });
            if (result.status === "invalid-policy") {
              await context.ui.dialog.alert({
                title: "Lovely permissions Mode",
                message: `Configuration invalid for mode ${selected}.`,
              });
            }
          },
        },
      ],
    }));

    return context.ui.slot({
      append: "session.composer.top",
      render: ({ sessionID }) => <AskBannerSlot context={context} sessionID={sessionID} />,
    });
  },
});
