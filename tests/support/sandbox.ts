import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vite-plus/test";

/** Scratch space for one test file. Every stub engine and the empty PATH directory live under it. */
export const sandboxRoot = mkdtempSync(join(tmpdir(), "lovely-perms-test-"));

/** A directory with nothing in it, so no engine can be found on PATH. */
export const emptyPathDir = join(sandboxRoot, "empty-path");
mkdirSync(emptyPathDir);

/** A global configuration directory with no policy file, so no test reads the real one. */
export const emptyConfigDir = join(sandboxRoot, "empty-config");
mkdirSync(emptyConfigDir);

/** A project directory with no policy file. */
export const emptyProjectDir = join(sandboxRoot, "empty-project");
mkdirSync(emptyProjectDir);

afterAll(() => {
  rmSync(sandboxRoot, { recursive: true, force: true });
});
