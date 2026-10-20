import { statSync } from "node:fs";
import { delimiter, join } from "node:path";

export const ENGINE_BINARY = "lovely-pi-bash-permissions";
export const ENGINE_OVERRIDE = "LOVELY_PI_BASH_PERMISSIONS_BIN";

/**
 * The override if it names an existing file, otherwise the first engine found on PATH.
 * The override comes from the environment only, never from a policy file, so a
 * project cannot point the plugin at an engine of its own.
 */
export function resolveEngine(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const override = env[ENGINE_OVERRIDE];
  if (override !== undefined && isFile(override)) return override;
  for (const dir of (env.PATH ?? "").split(delimiter)) {
    if (dir === "") continue;
    const candidate = join(dir, ENGINE_BINARY);
    if (isFile(candidate)) return candidate;
  }
  return undefined;
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
