export function jsx(
  type: string | ((props: Record<string, unknown>) => unknown),
  props: Record<string, unknown>,
) {
  if (typeof type === "function") return type(props);
  return { type, props };
}

export const jsxs = jsx;
