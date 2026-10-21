import { rmSync } from "node:fs";
import { afterAll } from "bun:test";
import { sandboxRoot } from "../../tests/support/sandbox-core.ts";

export {
  emptyConfigDir,
  emptyPathDir,
  emptyProjectDir,
  sandboxRoot,
} from "../../tests/support/sandbox-core.ts";

afterAll(() => {
  rmSync(sandboxRoot, { recursive: true, force: true });
});
