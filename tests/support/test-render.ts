import { testRender, type JSX } from "@opentui/solid";

type TestRenderSetup = Awaited<ReturnType<typeof testRender>>;

interface TestRenderSize {
  readonly width?: number;
  readonly height?: number;
}

export async function withTestRender<T>(
  render: () => JSX.Element,
  run: (setup: TestRenderSetup) => T | Promise<T>,
  size: TestRenderSize = {},
): Promise<T> {
  const setup = await testRender(render, {
    width: size.width ?? 80,
    height: size.height ?? 6,
  });

  try {
    await setup.renderOnce();
    return await run(setup);
  } finally {
    await setup.dispose();
  }
}
