import { afterEach, beforeEach } from "bun:test";

/**
 * Restores the named environment variables after each test in the calling file, so a
 * test may set them. Call it at the top of the file, before the file's own beforeEach.
 */
export function restoreEnvAfterEach(keys: readonly string[]): void {
  let saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  });
  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}
