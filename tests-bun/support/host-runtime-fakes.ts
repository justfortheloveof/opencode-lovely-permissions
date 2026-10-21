import { mock } from "bun:test";

void mock.module("@opencode/plugin/tui", () => ({
  Plugin: {
    define<T>(plugin: T): T {
      return plugin;
    },
  },
}));

void mock.module("@opentui/solid/jsx-runtime", () => ({
  jsx(
    type: string | ((props: Record<string, unknown>) => unknown),
    props: Record<string, unknown>,
  ) {
    if (typeof type === "function") return type(props);
    if (type === "text") return props.children;
    return { type, props };
  },
}));

void mock.module("solid-js", () => ({
  onMount(callback: () => void) {
    callback();
  },
}));
