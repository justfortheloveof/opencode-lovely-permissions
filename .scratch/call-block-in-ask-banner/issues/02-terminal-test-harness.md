# 02: Extend the terminal test harness

**What to build:** The test-support extensions the call block work needs, with no behaviour change. The fake terminal context learns to hold a session's messages — a data collection with list, get, sync, and invalidate, plus a setter the tests use to seed them — and its pending permissions carry the request's `source`, `action`, and `id` in addition to the message. The context exposes the renderer and the theme the banner will read. The frame-capture helper accepts a width and a height, defaulting to its current 80×6, so tests can render at several terminal dimensions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The fake terminal context can seed a session's messages, and code under test can read, sync, and invalidate them the way the real plugin context's data collection does
- [ ] The fake pending permissions can carry a `source`, an `action`, and an `id` alongside the existing message
- [ ] The fake context exposes a renderer whose terminal dimensions the tests can set, and a theme the banner's styling can read
- [ ] The frame-capture helper accepts a width and a height, defaulting to its current 80×6
- [ ] The entire existing test suite passes unchanged — no production code is modified by this ticket
