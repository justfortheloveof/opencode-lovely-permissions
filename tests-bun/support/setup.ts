import "./host-runtime-fakes.ts";
import { beforeEach } from "bun:test";
import { restoreEnvAfterEach } from "./env.ts";
import { emptyConfigDir, emptyPathDir } from "./sandbox.ts";

const OVERRIDE = "LOVELY_PI_BASH_PERMISSIONS_BIN";
const CONFIG_DIR = "OPENCODE_CONFIG_DIR";

restoreEnvAfterEach(["PATH", OVERRIDE, CONFIG_DIR]);

beforeEach(() => {
  process.env.PATH = emptyPathDir;
  delete process.env[OVERRIDE];
  process.env[CONFIG_DIR] = emptyConfigDir;
});
