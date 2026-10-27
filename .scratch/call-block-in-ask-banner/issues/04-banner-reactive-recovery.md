# 04: Banner recovers and tracks the prompt

**What to build:** The banner's call block behaves reactively. On mount, the slot syncs the viewed session family's messages alongside its existing permission sync, so a reconnect while an ask is pending recovers the block. The block re-derives as the chosen ask changes: when the user answers one ask, the next pending ask's call block appears. If a message read fails, the banner leaves the brand label and the reasons rendered and the failure stays contained — the prompt, the verdict, and the reasons keep working.

**Blocked by:**

- 03: Banner renders the call block

**Status:** resolved

- [x] A message sync runs on mount for the viewed session and its family, alongside the permission sync
- [x] A message that arrives after the banner has already rendered fills the block in
- [x] Answering one ask switches the block to the next pending ask's call
- [x] A failing message read leaves the label and reasons rendered and produces no unhandled error
- [x] The banner and the prompt never disagree about which ask is being decided
