import { rmSync } from "node:fs";
import { afterAll } from "vite-plus/test";
import { sandboxRoot } from "./sandbox-core.ts";

export { emptyConfigDir, emptyPathDir, emptyProjectDir, sandboxRoot } from "./sandbox-core.ts";

afterAll(() => {
  rmSync(sandboxRoot, { recursive: true, force: true });
});
