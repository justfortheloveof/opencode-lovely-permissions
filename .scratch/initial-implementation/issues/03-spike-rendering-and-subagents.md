# 03: Spike: rendering and subagents

**What to build:** Answer two questions against the installed OpenCode 2.0.30 in a throwaway project outside the repository. First, do multi-line permission messages render as bullets in the ask prompt and in a denial? Second, do shell calls made by subagents reach the permission hook? Record both results in the spec's Further Notes. Amend the spec where an answer changes a decision.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Recorded: whether multi-line messages render as bullets, with the rendered text as evidence
- [x] If they do not, the spec's message decision is amended to one line per reason
- [x] Recorded: whether subagent shell calls reach the permission hook
- [x] If subagent calls bypass the hook, story 47 is amended in the spec
