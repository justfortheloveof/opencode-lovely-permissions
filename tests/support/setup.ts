import { afterEach, beforeEach } from "vite-plus/test";
import { emptyPathDir } from "./sandbox.ts";

const OVERRIDE = "LOVELY_PI_BASH_PERMISSIONS_BIN";

let saved: { path: string | undefined; override: string | undefined } | undefined;

/**
 * Every test starts with no engine reachable. PATH is an empty directory and the
 * override is unset, so a test that does not arrange an engine can never run the
 * real one. Lookup tests that need PATH set it themselves.
 */
beforeEach(() => {
  saved = { path: process.env.PATH, override: process.env[OVERRIDE] };
  process.env.PATH = emptyPathDir;
  delete process.env[OVERRIDE];
});

afterEach(() => {
  if (saved === undefined) return;
  if (saved.path === undefined) delete process.env.PATH;
  else process.env.PATH = saved.path;
  if (saved.override === undefined) delete process.env[OVERRIDE];
  else process.env[OVERRIDE] = saved.override;
  saved = undefined;
});
