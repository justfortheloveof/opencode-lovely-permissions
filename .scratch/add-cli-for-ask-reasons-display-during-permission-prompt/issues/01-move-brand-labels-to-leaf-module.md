Status: ready-for-agent

# 01: Move the brand labels to a leaf module

**Blocked by:** None (can start immediately)

**What to build:** The ask, deny, and not-run brand labels live in a module that also imports engine code. Move them into a module with no imports, so the terminal half can use them without loading the engine. The existing module keeps working through the new one. No behaviour change.

**Acceptance criteria:**
- [ ] The three labels are defined in a module that imports nothing.
- [ ] Code that used the labels from the old module still works.
- [ ] The existing test suite passes unchanged.
