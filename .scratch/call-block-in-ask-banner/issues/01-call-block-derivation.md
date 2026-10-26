# 01: Pure call-block derivation

**What to build:** A pure module that derives the call block's content from the chosen ask. Given the ask's permission request and the session's message data, it yields the content-and-filetype pair the banner's call block should show, or nothing. For a shell ask it resolves the request's `source` to the session message, finds the matching tool part, and reads the full command line from its input — handling both the object input of a running call and the string input of a streaming one. Any other action yields nothing, leaving the seam through which a future non-shell ask adds its own prettified entry.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A shell ask whose `source` resolves to a message with a matching tool part yields the full command line with filetype `bash`
- [ ] A running call's object input and a streaming call's string input both resolve to the same command line
- [ ] A request without a `source` yields nothing
- [ ] A `source` whose message is missing yields nothing
- [ ] A `source` whose message has no matching tool part yields nothing
- [ ] A non-shell action yields nothing
- [ ] The derivation is a pure function of its inputs, mirroring the existing ask-banner pick rule as its house pattern
- [ ] The module is exercised by its own test file, and the existing suite stays green
