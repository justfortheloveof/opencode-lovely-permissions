import { beforeEach } from "vite-plus/test";
import { restoreEnvAfterEach } from "./env.ts";
import { emptyConfigDir, emptyPathDir } from "./sandbox.ts";

const OVERRIDE = "LOVELY_PI_BASH_PERMISSIONS_BIN";
const CONFIG_DIR = "OPENCODE_CONFIG_DIR";

restoreEnvAfterEach(["PATH", OVERRIDE, CONFIG_DIR]);

/**
 * Every test starts with no engine reachable and no global policy. PATH is an empty
 * directory, the override is unset, and the configuration directory is empty, so a
 * test that does not arrange them can never run the real engine or read the real
 * user configuration. Tests that need them set them themselves.
 */
beforeEach(() => {
  process.env.PATH = emptyPathDir;
  delete process.env[OVERRIDE];
  process.env[CONFIG_DIR] = emptyConfigDir;
});
