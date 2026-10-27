# 03: Banner renders the call block

**What to build:** While an ask is pending, the ask banner shows, in order, the brand label, the call block, and the reason bullets. The call block is a syntax-highlighted code element showing the ask's tool call — for a shell ask, the full command line — word-wrapped, selectable, and at most half the terminal height, with longer content scrolling inside the block so the composer stays on screen. Its highlighting style is built from the host's theme; if the theme cannot produce one, the block degrades to unstyled text and the banner never fails. When the derivation yields nothing, the banner renders exactly as it does today: label and reasons, no block.

**Blocked by:**

- 01: Pure call-block derivation
- 02: Extend the terminal test harness

**Status:** resolved

- [x] The banner frame shows the brand label, then the command, then the reasons, in that order
- [x] The block shows the full command line for a shell ask, word-wrapped and selectable
- [x] A command longer than half the terminal height is clipped to the bound at two tested terminal sizes, with the remainder reachable by scrolling
- [x] A short command occupies only as many lines as it needs — the block adds no empty space
- [x] The block is syntax-styled from the host theme and degrades to unstyled text when no style can be built
- [x] When the derivation yields nothing, the frame matches today's label-and-reasons banner exactly
- [x] The server half and the ask-banner pick rule are untouched
