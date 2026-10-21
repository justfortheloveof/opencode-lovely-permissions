import { testRender, type JSX } from "@opentui/solid";

type TestRenderSetup = Awaited<ReturnType<typeof testRender>>;

export async function withTestRender<T>(
  render: () => JSX.Element,
  run: (setup: TestRenderSetup) => T | Promise<T>,
): Promise<T> {
  const setup = await testRender(render, { width: 80, height: 6 });

  try {
    await setup.renderOnce();
    return await run(setup);
  } finally {
    await setup.dispose();
  }
}
