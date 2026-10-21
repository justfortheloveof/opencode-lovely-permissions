import { afterAll, afterEach, beforeEach, mock } from "bun:test";

// Shared test fixtures use these lifecycle hooks; keep their runner-specific binding in the Bun lane.
void mock.module("vite-plus/test", () => ({ afterAll, afterEach, beforeEach }));
