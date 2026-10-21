# 01: Switch repository installs to Bun through Vite+

**What to build:** Contributors can install the repository's existing dependency graph through Vite+ using Bun, with one authoritative Bun lockfile. The existing Vite+ checks and Vitest suite continue to work during this first migration slice.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Vite+ selects Bun for package installation from the repository's package-manager metadata.
- [x] The Bun lockfile is authoritative, and pnpm-specific lockfile and workspace configuration are removed or replaced with Bun-compatible single-package configuration.
- [x] Existing dependency versions and the Vite+ alias/override behavior resolve under Bun without creating a workspace solely for catalog support.
- [x] Bun's default release-age behavior is used; no release-age delay or pnpm-specific exclusions are carried over.
- [x] The existing Vite+ check and Vitest test commands still pass before any test suites are migrated.

## Comments

- Migrated the existing pnpm-resolved dependency graph to `bun.lock`, selected Bun 1.4.3 in package metadata, and replaced the catalog with explicit `vite-plus@1.3.0` and the Bun-compatible `vite` alias override. Removed pnpm lock/workspace files; no workspace or release-age policy was added.
- Validation passed: `vp env doctor` selected Bun 1.4.3; `vp install --frozen-lockfile`; `vp check`; `vp test` (12 files, 152 tests); and an installed-package check confirmed `vite` resolves to `@voidzero-dev/vite-plus-core@1.3.0`.
