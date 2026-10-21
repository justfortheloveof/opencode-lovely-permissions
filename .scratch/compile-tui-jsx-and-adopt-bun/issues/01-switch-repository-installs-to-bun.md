# 01: Switch repository installs to Bun through Vite+

**What to build:** Contributors can install the repository's existing dependency graph through Vite+ using Bun, with one authoritative Bun lockfile. The existing Vite+ checks and Vitest suite continue to work during this first migration slice.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Vite+ selects Bun for package installation from the repository's package-manager metadata.
- [ ] The Bun lockfile is authoritative, and pnpm-specific lockfile and workspace configuration are removed or replaced with Bun-compatible single-package configuration.
- [ ] Existing dependency versions and the Vite+ alias/override behavior resolve under Bun without creating a workspace solely for catalog support.
- [ ] Bun's default release-age behavior is used; no release-age delay or pnpm-specific exclusions are carried over.
- [ ] The existing Vite+ check and Vitest test commands still pass before any test suites are migrated.
