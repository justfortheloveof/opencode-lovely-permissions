# 05: Docs and full regression

**What to build:** The feature is documented and the package is verified end to end. The README gains an ask-banner section describing what the banner shows: the brand label, the reasons, and the highlighted call block — including that it is word-wrapped, bounded at half the terminal height, and scrolls inside itself for long commands. The full test suite and the TUI build pass.

**Blocked by:**

- 04: Banner recovers and tracks the prompt

**Status:** resolved

- [x] The README describes the ask banner: brand label, reasons, and call block (highlighted, word-wrapped, half-viewport bound, self-scrolling, selectable)
- [x] The full bun test suite passes
- [x] The TUI entry builds
- [x] No changes are needed to the glossary, ADR-0007, or the server contract
