import { Plugin } from "opentui:runtime-module:%40opencode%2Fplugin%2Ftui";
import { jsx } from "opentui:runtime-module:%40opentui%2Fsolid%2Fjsx-runtime";

export function Placeholder() {
  return jsx("text", { children: "Ask reasons will appear here." });
}

export default Plugin.define({
  id: "lovely-bash-permissions",
  setup() {},
});
