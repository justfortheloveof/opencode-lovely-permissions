Status: ready-for-human

# 09: Remote loading check

**Blocked by:** 04 (Slot wiring and the fake terminal harness)

**What to build:** Check whether the terminal half loads and works remotely, without a local install. The user runs this in the OpenCode app. An agent does not run it.

**Acceptance criteria:**
- [ ] A server running the server half, with the package not installed on the terminal machine: does the server-listed copy load? Record yes or no.
- [ ] With a `cli.json` entry on the terminal machine: the banner shows that server's branded asks. Record the result.
- [ ] If an older copy is cached on the terminal machine: which copy loads? Record it.
- [ ] A remote server without the server half: no banner and no error. Record the result.
- [ ] Record the results under `## Comments` at the bottom of this file.
