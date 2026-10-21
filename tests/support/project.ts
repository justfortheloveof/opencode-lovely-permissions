import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LayeredPolicy } from "../../src/policy-layers.ts";
import { layeredPolicy, readLayers } from "../../src/policy-layers.ts";
import { policyLocations } from "../../src/policy-locations.ts";
import { sandboxRoot } from "./sandbox-core.ts";

/** A project directory whose `.opencode` policy file holds the object, as JSON. */
export function projectWith(policy: unknown): string {
  return projectWithText(JSON.stringify(policy));
}

/** A project directory whose `.opencode` policy file holds exactly this text. */
export function projectWithText(text: string): string {
  const directory = mkdtempSync(join(sandboxRoot, "project-"));
  mkdirSync(join(directory, ".opencode"));
  writeFileSync(join(directory, ".opencode", "lovely-permissions.jsonc"), text);
  return directory;
}

/** The layered policy the three files of a project give, read the way setup reads them. */
export async function readLayeredPolicy(
  directory: string,
  env: NodeJS.ProcessEnv = process.env,
  home?: string,
): Promise<LayeredPolicy> {
  return layeredPolicy(await readLayers(policyLocations(directory, env, home)));
}
