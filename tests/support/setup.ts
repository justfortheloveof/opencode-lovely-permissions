import { afterEach, beforeEach } from "vite-plus/test";
import { emptyConfigDir, emptyPathDir } from "./sandbox.ts";

const OVERRIDE = "LOVELY_PI_BASH_PERMISSIONS_BIN";
const CONFIG_DIR = "OPENCODE_CONFIG_DIR";

let saved:
  | { path: string | undefined; override: string | undefined; configDir: string | undefined }
  | undefined;

/**
 * Every test starts with no engine reachable and no real configuration. PATH is an
 * empty directory, the override is unset, and the global configuration directory is
 * empty, so a test that does not arrange them can never run the real engine or read
 * the user's policy. Lookup tests that need PATH set it themselves.
 */
beforeEach(() => {
  saved = {
    path: process.env.PATH,
    override: process.env[OVERRIDE],
    configDir: process.env[CONFIG_DIR],
  };
  process.env.PATH = emptyPathDir;
  delete process.env[OVERRIDE];
  process.env[CONFIG_DIR] = emptyConfigDir;
});

afterEach(() => {
  if (saved === undefined) return;
  if (saved.path === undefined) delete process.env.PATH;
  else process.env.PATH = saved.path;
  if (saved.override === undefined) delete process.env[OVERRIDE];
  else process.env[OVERRIDE] = saved.override;
  if (saved.configDir === undefined) delete process.env[CONFIG_DIR];
  else process.env[CONFIG_DIR] = saved.configDir;
  saved = undefined;
});
