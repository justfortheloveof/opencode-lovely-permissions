export function jsx(type: string, props: Record<string, unknown>) {
  return { type, props };
}

export const jsxs = jsx;
